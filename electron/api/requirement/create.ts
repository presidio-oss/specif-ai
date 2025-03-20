import { createSolutionSchema, type SolutionResponse, type CreateSolutionRequest } from '../../schema/requirement/create.schema';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { createBRDPrompt } from '../../prompts/requirement/create-brd';
import { createPRDPrompt } from '../../prompts/requirement/create-prd';
import { createUIRPrompt } from '../../prompts/requirement/create-uir';
import { createNFRPrompt } from '../../prompts/requirement/create-nfr';

export async function createSolution(event: IpcMainInvokeEvent, data: unknown): Promise<SolutionResponse> {
  try {
    // Get LLM Config
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

        const handler = buildLLMHandler(
          llmConfig.activeProvider,
          llmConfig.providerConfigs[llmConfig.activeProvider].config
        );
        
        // Get LLM response
        const response = await handler.invoke(messages);

        try {
          const parsedResponse = JSON.parse(response);
          results[key] = parsedResponse[key];
          console.log(`[create-solution] Successfully generated ${key.toUpperCase()} requirements`);
        } catch (error) {
          console.error(`[create-solution] Error parsing ${key.toUpperCase()} response:`, error);
          throw new Error(`Failed to parse ${key.toUpperCase()} response as JSON`);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error in createSolution:', error);
    throw error;
  }
}
