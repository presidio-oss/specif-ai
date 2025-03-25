import { createSolutionSchema, type SolutionResponse, type CreateSolutionRequest } from '../../schema/solution/create.schema';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { createBRDPrompt } from '../../prompts/solution/create-brd';
import { createPRDPrompt } from '../../prompts/solution/create-prd';
import { createUIRPrompt } from '../../prompts/solution/create-uir';
import { createNFRPrompt } from '../../prompts/solution/create-nfr';
import { extractRequirementsFromResponse } from '../../utils/custom-json-parser';


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

    type RequirementType = {
      key: keyof Pick<SolutionResponse, 'brd' | 'prd' | 'uir' | 'nfr'>;
      generatePrompt: (params: { name: string; description: string; max_count: number }) => string;
      preferencesKey: keyof Pick<CreateSolutionRequest, 'brdPreferences' | 'prdPreferences' | 'uirPreferences' | 'nfrPreferences'>;
    };

    const requirementTypes: RequirementType[] = [
      { key: 'brd', generatePrompt: createBRDPrompt, preferencesKey: 'brdPreferences' },
      { key: 'prd', generatePrompt: createPRDPrompt, preferencesKey: 'prdPreferences' },
      { key: 'uir', generatePrompt: createUIRPrompt, preferencesKey: 'uirPreferences' },
      { key: 'nfr', generatePrompt: createNFRPrompt, preferencesKey: 'nfrPreferences' }
    ];

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    for (const { key, generatePrompt, preferencesKey } of requirementTypes) {
      const preferences = validatedData[preferencesKey];
      if (preferences.isEnabled) {
        console.log(`[create-solution] Generating ${key.toUpperCase()} requirements...`);
        
        // Generate prompt
        const prompt = generatePrompt({
          name: validatedData.name,
          description: validatedData.description,
          max_count: preferences.max_count
        });

        // Prepare messages for LLM
        const messages = await LLMUtils.prepareMessages(prompt);
        
        try {
          const response = await handler.invoke(messages);
          
          const extractedContent = extractRequirementsFromResponse(response, key);
          
          if (extractedContent && extractedContent.length > 0) {
            results[key] = extractedContent;
            console.log(`[create-solution] Successfully generated ${key.toUpperCase()} requirements`);
          } else {
            results[key] = [{ 
              id: `${key.toUpperCase()}1`, 
              title: `${key.toUpperCase()} Requirements`, 
              requirement: response 
            }];
            console.log(`[create-solution] Stored raw response as ${key.toUpperCase()} requirement`);
          }
        } catch (error) {
          console.error(`[create-solution] Error generating ${key.toUpperCase()} requirements:`, error);
          results[key] = [{ 
            id: `${key.toUpperCase()}_ERROR`, 
            title: `Error Generating ${key.toUpperCase()} Requirements`, 
            requirement: `Failed to generate requirements: ${error}` 
          }];
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error in createSolution:', error);
    throw error;
  }
}