import { getSuggestionsSchema } from '../schema/schema';
import { HandlebarsService } from '../services/template/handlebars-service';
import { LLMUtils } from '../services/llm/llm-utils';
import { buildLLMHandler } from '../services/llm';
import { store } from '../services/store';
import * as path from 'path';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../llm/llm-types';

const templateDir = path.join(__dirname, '../../templates');
const handlebarsService = new HandlebarsService(templateDir);

export async function getSuggestions(event: IpcMainInvokeEvent, data: unknown): Promise<string[]> {
  try {
    // Get LLM config from store singleton
    console.log('[get-suggestions] Getting LLM config...');
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[get-suggestions] Using LLM config:', llmConfig);

    // Validate input data using schema
    console.log('[get-suggestions] Validating input data...');
    const validatedData = getSuggestionsSchema.parse(data);
    console.log('[get-suggestions] Input data validated successfully:', validatedData);
    const { name, description, type, requirement, suggestions, selectedSuggestion, knowledgeBase } = validatedData;

    // Render the template
    console.log('[get-suggestions] Rendering template...');
    let prompt = handlebarsService.renderTemplate('improved-suggestions', {
      name,
      description,
      type,
      requirement,
      suggestions,
      selectedSuggestion,
      knowledgeBase,
    });

    // Apply knowledge base constraint if needed
    if (knowledgeBase) {
      console.log('[get-suggestions] Applying knowledge base constraint...');
      prompt = await LLMUtils.generateKnowledgeBasePromptConstraint(knowledgeBase, prompt);
    }

    // Prepare messages for LLM
    console.log('[get-suggestions] Preparing messages for LLM...');
    const messages = await LLMUtils.prepareMessages(prompt);

    // Create LLM handler with config from store
    const handlerConfig = {
      ...llmConfig.config,
      ...(llmConfig.model ? { modelId: llmConfig.model } : {})
    };

    const handler = buildLLMHandler(llmConfig.provider, handlerConfig);

    // Invoke the LLM
    console.log('[get-suggestions] Invoking LLM...');
    const response = await handler.invoke(messages);
    console.log('[get-suggestions] LLM invocation completed. Response received:', response);

    // Parse the response
    let improvedSuggestions;
    console.log('[get-suggestions] Parsing LLM response...');
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
