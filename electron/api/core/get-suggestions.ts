import { IpcMainInvokeEvent } from 'electron';
import { getSuggestionsSchema } from '../../schema/core/get-suggestions.schema';
import { generateImprovedSuggestionsPrompt } from '../../prompts/core/improved-suggestions';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import { LLMUtils } from '../../services/llm/llm-utils';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { repairJSON } from '../../utils/custom-json-parser';

export async function getSuggestions(event: IpcMainInvokeEvent, data: unknown): Promise<string[]> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[get-suggestions] Using LLM config:', llmConfig);
    const validatedData = getSuggestionsSchema.parse(data);

    const { name, description, type, requirement, suggestions, selectedSuggestion, knowledgeBase, bedrockConfig } = validatedData;
    let prompt = generateImprovedSuggestionsPrompt({
      name,
      description,
      type,
      requirement,
      suggestions,
      selectedSuggestion,
      knowledgeBase,
    });

    if (knowledgeBase) {
      console.log('[get-suggestions] Applying knowledge base constraint...');
      if (!bedrockConfig) {
        throw new Error('Bedrock configuration is required when using knowledge base');
      }
      prompt = await LLMUtils.generateKnowledgeBasePromptConstraint(
        knowledgeBase,
        prompt,
        bedrockConfig
      );
    }

    console.log('[get-suggestions] Preparing messages for LLM...');
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );
    const response = await handler.invoke(messages, null, "core:getSuggestions");
    console.log('[get-suggestions] LLM Response:', response);

    const repairedResponse = repairJSON(response);
    let improvedSuggestions;
    try {
      improvedSuggestions = JSON.parse(repairedResponse);
      console.log('[get-suggestions] LLM response parsed successfully:', improvedSuggestions);
    } catch (error) {
      console.error('[get-suggestions] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return improvedSuggestions;
  } catch (error) {
    console.error('Error in getSuggestions:', error);
    throw error;
  }
}
