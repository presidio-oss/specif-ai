import { chatUpdateRequirementSchema, type ChatUpdateRequirementResponse } from '../../schema/requirement/chat.schema';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { chatUpdateRequirementPrompt } from '../../prompts/requirement/chat';
import { repairJSON } from '../../utils/custom-json-parser';
import { OPERATIONS } from '../../helper/constants';
import { traceBuilder } from '../../utils/trace-builder';

export async function chatUpdateRequirement(event: IpcMainInvokeEvent, data: unknown): Promise<ChatUpdateRequirementResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[chat-update-requirement] Using LLM config:', llmConfig);
    const validatedData = chatUpdateRequirementSchema.parse(data);

    const {
      name,
      description,
      type,
      requirement,
      userMessage,
      requirementAbbr,
      chatHistory,
      knowledgeBase,
      bedrockConfig,
      brds
    } = validatedData;

    // Generate prompt
    const prompt = chatUpdateRequirementPrompt({
      name,
      description,
      type,
      requirement,
      userMessage,
      requirementAbbr,
      brds
    });

    // Generate knowledge base constraint prompt if provided
    let basePrompt = prompt;
    if (knowledgeBase) {
      if (!bedrockConfig) {
        throw new Error('Bedrock configuration is required when using knowledge base');
      }
      basePrompt = await LLMUtils.generateKnowledgeBasePromptConstraint(
        knowledgeBase,
        prompt,
        bedrockConfig
      );
    }

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(basePrompt, chatHistory);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(requirementAbbr, OPERATIONS.CHAT)
    const response = await handler.invoke(messages, null, traceName);
    console.log('[chat-update-requirement] LLM Response:', response);

    let result;
    try {
      const cleanedResponse = repairJSON(response);
      const parsed = JSON.parse(cleanedResponse);
      if (!parsed.response) {
        throw new Error('Invalid response structure');
      }
      result = parsed;
    } catch (error) {
      console.error('[chat-update-requirement] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return {
      response: result.response
    };
  } catch (error) {
    console.error('Error in chatUpdateRequirement:', error);
    throw error;
  }
}
