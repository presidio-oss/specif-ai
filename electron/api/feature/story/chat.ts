import { chatUserStoryTaskSchema, type ChatUserStoryTaskResponse } from '../../../schema/feature/story/chat.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { chatUserStoryTaskPrompt } from '../../../prompts/feature/story/chat';
import { traceBuilder } from '../../../utils/trace-builder';
import { OPERATIONS } from '../../../helper/constants';

export async function chatUserStoryTask(event: IpcMainInvokeEvent, data: unknown): Promise<ChatUserStoryTaskResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[chat-user-story-task] Using LLM config:', llmConfig);
    const validatedData = chatUserStoryTaskSchema.parse(data);

    const prompt = chatUserStoryTaskPrompt({
      name: validatedData.name,
      description: validatedData.description,
      type: validatedData.type,
      requirement: validatedData.requirement,
      prd: validatedData.prd,
      us: validatedData.us
    });
    const traceName = traceBuilder(validatedData.type.trim(), OPERATIONS.CHAT);

    let basePrompt = prompt;
    if (validatedData.knowledgeBase?.trim()) {
      if (!validatedData.bedrockConfig) {
        throw new Error('Bedrock configuration is required when using knowledge base');
      }
      basePrompt = await LLMUtils.generateKnowledgeBasePromptConstraint(
        validatedData.knowledgeBase,
        prompt,
        validatedData.bedrockConfig
      );
    }

    const messages = await LLMUtils.prepareMessages(
      basePrompt,
      validatedData.chatHistory,
    );

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages, null, traceName);
    console.log('[chat-user-story-task] LLM Response:', response);

    return {
      response
    };
  } catch (error) {
    console.error('Error in chatUserStoryTask:', error);
    throw error;
  }
}
