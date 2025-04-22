import { createSolutionSchema, type SolutionResponse, type CreateSolutionRequest } from '../../schema/solution/create.schema';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler, LLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { createBRDPrompt } from '../../prompts/solution/create-brd';
import { createPRDPrompt } from '../../prompts/solution/create-prd';
import { createUIRPrompt } from '../../prompts/solution/create-uir';
import { createNFRPrompt } from '../../prompts/solution/create-nfr';
import { extractRequirementsFromResponse } from '../../utils/custom-json-parser';
import { traceBuilder } from '../../utils/trace-builder';
import { OPERATIONS } from '../../helper/constants';
import { buildCreateSolutionWorkflow } from '../../agentic/create-solution-workflow';
import { buildLangchainModelProvider } from '../../services/llm/llm-langchain';
import { ICreateSolutionWorkflowStateAnnotation } from '../../agentic/create-solution-workflow/state';
import { REQUIREMENT_TYPE } from '../../constants/requirement.constants';
import { getMCPTools } from '../../mcp';
import { MemorySaver } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import { ObservabilityManager } from '../../services/observability/observability.manager';
import { SolutionRepository } from '../../repo/solution.repo';
import { MasterRepository } from '../../repo/master.repo';

// types

type RequirementTypeMeta = {
  key: keyof Pick<SolutionResponse, 'brd' | 'prd' | 'uir' | 'nfr'>;
  generatePrompt: (params: { name: string; description: string; maxCount: number; brds?: any[] }) => string;
  preferencesKey: keyof Pick<CreateSolutionRequest, 'brdPreferences' | 'prdPreferences' | 'uirPreferences' | 'nfrPreferences'>;
};

type GenerateRequirementParams = RequirementTypeMeta & {
  data: CreateSolutionRequest,
  llmHandler: LLMHandler,
  brds?: any[];
};

// constants
const requirementTypes: Array<RequirementTypeMeta> = [
  { key: 'brd', generatePrompt: createBRDPrompt, preferencesKey: 'brdPreferences' },
  { key: 'uir', generatePrompt: createUIRPrompt, preferencesKey: 'uirPreferences' },
  { key: 'nfr', generatePrompt: createNFRPrompt, preferencesKey: 'nfrPreferences' }
];

const prdRequirementType = { key: 'prd', generatePrompt: createPRDPrompt, preferencesKey: 'prdPreferences' } as const;

const generateRequirement = async ({ key, generatePrompt, preferencesKey, data, llmHandler, brds }: GenerateRequirementParams) => {
  console.log(`[create-solution] Generating ${key.toUpperCase()} requirements...`);
  const preferences = data[preferencesKey];
  
  // Generate prompt
  const prompt = generatePrompt({
    name: data.name,
    description: data.description,
    maxCount: preferences.maxCount,
    brds
  });
  
  let result;
  // Prepare messages for LLM
  const messages = await LLMUtils.prepareMessages(prompt);

  try {

    const traceName = traceBuilder(key, OPERATIONS.CREATE);
    const response = await llmHandler.invoke(messages, null, traceName);
    const extractedContent = extractRequirementsFromResponse(response, key);

    if (extractedContent && extractedContent.length > 0) {
      result = extractedContent;
      console.log(`[create-solution] Successfully generated ${key.toUpperCase()} requirements`);
    } else {
      result = [{
        id: `${key.toUpperCase()}1`,
        title: `${key.toUpperCase()} Requirements`,
        requirement: response
      }];
      console.log(`[create-solution] Stored raw response as ${key.toUpperCase()} requirement`);
    }
  } catch (error) {
    console.error(`[create-solution] Error generating ${key.toUpperCase()} requirements:`, error);
    result = [{
      id: `${key.toUpperCase()}_ERROR`,
      title: `Error Generating ${key.toUpperCase()} Requirements`,
      requirement: `Failed to generate requirements: ${error}`
    }];
  }

  return result;
}

export async function createSolution(event: IpcMainInvokeEvent, data: unknown): Promise<SolutionResponse> {
  try {
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('create-solution');

    const llmConfig = store.getLLMConfig();
    
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log("[create-solution] Using LLM config:", llmConfig);

    const validationSpan = trace.span({name: "input-validation"})
    const validatedData = await createSolutionSchema.parseAsync(data);
    validationSpan.end();

    const results: SolutionResponse = {
      createReqt: validatedData.createReqt ?? false,
      description: validatedData.description,
      name: validatedData.name
    };

    // Initialize repository
    const solRepository = new SolutionRepository(validatedData.name);
    const masterRepository = new MasterRepository();

    // Master database and check for existing solutions
    await masterRepository.initializeMasterDb();
    const existingSolutions = await masterRepository.getSolutionByName(validatedData.name);
    if (existingSolutions.length > 0) {
      throw new Error(`Solution with name "${validatedData.name}" already exists.`);
    }
    // Create solution in master database
    await masterRepository.createMasterSolution(validatedData.name, validatedData.description);


    // Initialize database and store metadata through repository
    await solRepository.initializeSolutionDb();
    await solRepository.saveSolutionMetadata(validatedData);
    if (!validatedData.createReqt) {
      return results;
    }

    
    const useAgent = true;

    if (useAgent) {
      let mcpTools = [];

      const memoryCheckpointer = new MemorySaver();

      try {
        mcpTools = await getMCPTools(llmConfig.activeProvider);
      } catch (error) {
        console.warn("Error getting mcp tools");
      }

      const createSolutionWorkflow = buildCreateSolutionWorkflow({
        tools: [...mcpTools],
        model: buildLangchainModelProvider(
          llmConfig.activeProvider,
          llmConfig.providerConfigs[llmConfig.activeProvider].config
        ),
        checkpointer: memoryCheckpointer
      });

      const initialState: Partial<
        ICreateSolutionWorkflowStateAnnotation["State"]
      > = {
        app: {
          name: validatedData.name,
          description: validatedData.description,
        },
        requirementGenerationPreferences: {
          [REQUIREMENT_TYPE.PRD]: validatedData.prdPreferences,
          [REQUIREMENT_TYPE.BRD]: validatedData.brdPreferences,
          [REQUIREMENT_TYPE.NFR]: validatedData.nfrPreferences,
          [REQUIREMENT_TYPE.UIR]: validatedData.uirPreferences,
        },
      };

      const config = {
        "configurable":{
          "thread_id": `${randomUUID()}_create_solution`,
          "trace": trace
        }
      }

      const stream = createSolutionWorkflow.streamEvents(initialState, {
        version: "v2",
        streamMode: "messages",
        ...config,
      })

      for await (const event of stream){
      }

      const response = await createSolutionWorkflow.getState({
        ...config
      })

      const generatedRequirements = response.values.generatedRequirements;

      return {
        createReqt: validatedData.createReqt ?? false,
        description: validatedData.description,
        name: validatedData.name,
        ...[
          REQUIREMENT_TYPE.PRD,
          REQUIREMENT_TYPE.BRD,
          REQUIREMENT_TYPE.NFR,
          REQUIREMENT_TYPE.UIR,
        ].reduce((acc, rt) => {
          return {
            ...acc,
            [rt.toLowerCase()]: generatedRequirements[rt].requirements,
          };
        }, {}),
      };
    }

    const llmHandler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    for (const { key, generatePrompt, preferencesKey } of requirementTypes) {
      const preferences = validatedData[preferencesKey];
      if (preferences.isEnabled) {
        results[key] = await generateRequirement({
          data: validatedData,
          generatePrompt: generatePrompt,
          key: key,
          preferencesKey: preferencesKey,
          llmHandler: llmHandler
        })
      }

      if (key == "brd") {
        let brds = results[key] ?? [];

        const prdPreferences = validatedData[prdRequirementType.preferencesKey];

        if(prdPreferences.isEnabled){
          results[prdRequirementType.key] = await generateRequirement({
            data: validatedData,
            llmHandler: llmHandler,
            ...prdRequirementType,
            brds: brds
          });
        }
      }
    }

    // Store requirements through repository
    await solRepository.saveRequirements(results);

    return results;
  } catch (error) {
    console.error('Error in createSolution:', error);
    throw error;
  }
}