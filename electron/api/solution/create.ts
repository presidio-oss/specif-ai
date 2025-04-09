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
import { COMPONENT, OPERATIONS } from '../../helper/constants';

// types

type RequirementTypeMeta = {
  key: keyof Pick<SolutionResponse, 'brd' | 'prd' | 'uir' | 'nfr'>;
  generatePrompt: (params: { name: string; description: string; max_count: number; brds?: any[] }) => string;
  preferencesKey: keyof Pick<CreateSolutionRequest, 'brdPreferences' | 'prdPreferences' | 'uirPreferences' | 'nfrPreferences'>;
};

type GenerateRequirementParams = RequirementTypeMeta & {
  data: CreateSolutionRequest,
  llmHandler: LLMHandler,
  brds?: any[];
};

// types

// constants

const requirementTypes: Array<RequirementTypeMeta> = [
  { key: 'brd', generatePrompt: createBRDPrompt, preferencesKey: 'brdPreferences' },
  { key: 'uir', generatePrompt: createUIRPrompt, preferencesKey: 'uirPreferences' },
  { key: 'nfr', generatePrompt: createNFRPrompt, preferencesKey: 'nfrPreferences' }
];

const prdRequirementType = { key: 'prd', generatePrompt: createPRDPrompt, preferencesKey: 'prdPreferences' } as const;

// constants

const generateRequirement = async ({ key, generatePrompt, preferencesKey, data, llmHandler, brds }: GenerateRequirementParams) => {
  console.log(`[create-solution] Generating ${key.toUpperCase()} requirements...`);
  const preferences = data[preferencesKey];
  
  // Generate prompt
  const prompt = generatePrompt({
    name: data.name,
    description: data.description,
    max_count: preferences.max_count,
    brds
  });
  
  let result;
  // Prepare messages for LLM
  const messages = await LLMUtils.prepareMessages(prompt);

  try {

    const traceName = traceBuilder(COMPONENT.SOLUTION, OPERATIONS.CREATE);
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
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[create-solution] Using LLM config:', llmConfig);
    const validatedData = createSolutionSchema.parse(data);

    const results: SolutionResponse = {
      createReqt: validatedData.createReqt ?? false,
      description: validatedData.description,
      name: validatedData.name
    };

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

    return results;
  } catch (error) {
    console.error('Error in createSolution:', error);
    throw error;
  }
}