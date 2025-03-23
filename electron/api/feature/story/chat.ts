import { chatUserStoryTaskSchema, type ChatUserStoryTaskResponse } from '../../../schema/feature/story/chat.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { chatUserStoryTaskPrompt } from '../../../prompts/feature/story/chat';

export async function chatUserStoryTask(event: IpcMainInvokeEvent, data: unknown): Promise<ChatUserStoryTaskResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[chat-user-story-task] Using LLM config:', llmConfig);
    const validatedData = chatUserStoryTaskSchema.parse(data);

    // Generate system prompt
    const systemPrompt = chatUserStoryTaskPrompt({
      name: validatedData.name,
      description: validatedData.description,
      type: validatedData.type,
      requirement: validatedData.requirement,
      prd: validatedData.prd,
      us: validatedData.us
    });

    // Generate knowledge base constraint prompt if needed
    let userPrompt = validatedData.userMessage;
    if (validatedData.knowledgeBase?.trim()) {
      userPrompt = await LLMUtils.generateKnowledgeBasePromptConstraint(
        validatedData.knowledgeBase,
        userPrompt
      );
    }

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(
      userPrompt,
      validatedData.chatHistory
    );

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages, systemPrompt);
    console.log('[chat-user-story-task] LLM Response:', response);

    return {
      response
    };
  } catch (error) {
    console.error('Error in chatUserStoryTask:', error);
    throw error;
  }
}
