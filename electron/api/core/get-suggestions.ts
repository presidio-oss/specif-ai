import { getSuggestionsSchema } from '../../schema/core/get-suggestions.schema';
import { HandlebarsService } from '../../services/template/handlebars-service';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import * as path from 'path';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';

const templateDir = path.join(__dirname, '../../../prompts');
const handlebarsService = new HandlebarsService(templateDir);

export async function getSuggestions(event: IpcMainInvokeEvent, data: unknown): Promise<string[]> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[get-suggestions] Using LLM config:', llmConfig);
    const validatedData = getSuggestionsSchema.parse(data);

    const { name, description, type, requirement, suggestions, selectedSuggestion, knowledgeBase } = validatedData;
    let prompt = handlebarsService.renderTemplate('improved-suggestions', {
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
      prompt = await LLMUtils.generateKnowledgeBasePromptConstraint(knowledgeBase, prompt);
    }

    console.log('[get-suggestions] Preparing messages for LLM...');
    const messages = await LLMUtils.prepareMessages(prompt);

    const handlerConfig = {
      ...llmConfig.config,
      ...(llmConfig.model ? { modelId: llmConfig.model } : {})
    };

    const handler = buildLLMHandler(llmConfig.provider, handlerConfig);
    const response = await handler.invoke(messages);

    let improvedSuggestions;
    try {
      improvedSuggestions = JSON.parse(response);
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
