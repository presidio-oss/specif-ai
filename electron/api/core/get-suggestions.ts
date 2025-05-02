import { IpcMainInvokeEvent } from 'electron';
import { getSuggestionsSchema } from '../../schema/core/get-suggestions.schema';
import { store } from '../../services/store';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { createSuggestionWorkflow } from '../../agentic/suggestion-workflow';
import { randomUUID } from "node:crypto";
import { MemorySaver } from "@langchain/langgraph";
import { buildLangchainModelProvider } from '../../services/llm/llm-langchain';
import { ObservabilityManager } from '../../services/observability/observability.manager';

export async function getSuggestions(_: IpcMainInvokeEvent, data: unknown): Promise<string[]> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('get-suggestions');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[get-suggestions] Using LLM config:', llmConfig);
    const validatedData = getSuggestionsSchema.parse(data);

    const memoryCheckpointer = new MemorySaver();
    
    const suggestionWorkflow = createSuggestionWorkflow({
      model: buildLangchainModelProvider(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      ),
      checkpointer: memoryCheckpointer
    });
    
    const initialState = {
      name: validatedData.name,
      description: validatedData.description,
      type: validatedData.type,
      requirement: validatedData.requirement,
      requirementAbbr: validatedData.requirementAbbr,
      suggestions: validatedData.suggestions || [],
      selectedSuggestion: validatedData.selectedSuggestion,
      knowledgeBase: validatedData.knowledgeBase,
      bedrockConfig: validatedData.bedrockConfig,
      brds: validatedData.brds || []
    };
    
    const config = {
      "configurable": {
        "thread_id": `${randomUUID()}_get_suggestions`,
        "trace": trace
      }
    };
    
    const stream = suggestionWorkflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });
    
    for await (const event of stream) {}
    
    const response = await suggestionWorkflow.getState({
      ...config
    });
    
    return response.values.suggestions;
  } catch (error) {
    console.error('Error in getSuggestions:', error);
    throw error;
  }
}
