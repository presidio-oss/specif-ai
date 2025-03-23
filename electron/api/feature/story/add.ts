import { IpcMainInvokeEvent } from 'electron';
import { addUserStorySchema, AddUserStoryRequest, AddUserStoryResponse } from '../../../schema/feature/story/add.schema';
import { addUserStoryPrompt } from '../../../prompts/feature/story/add';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { LLMConfigModel } from '../../../services/llm/llm-types';

export async function addUserStory(event: IpcMainInvokeEvent, data: unknown): Promise<AddUserStoryResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[add-user-story] Using LLM config:', llmConfig);
    const validatedData = addUserStorySchema.parse(data) as AddUserStoryRequest;

    let featureRequest = '';
    let fileContent = '';

    if (validatedData.contentType === 'fileContent') {
      if (validatedData.featureRequest && validatedData.useGenAI) {
        fileContent = validatedData.fileContent;
        featureRequest = validatedData.featureRequest;
      } else {
        fileContent = validatedData.fileContent;
        featureRequest = '';
      }
    } else if (validatedData.featureRequest && validatedData.useGenAI) {
      featureRequest = validatedData.featureRequest;
      fileContent = '';
    } else {
      featureRequest = validatedData.featureRequest;
      fileContent = '';
    }

    // Generate prompt
    const prompt = addUserStoryPrompt({
      name: validatedData.name,
      description: validatedData.description,
      reqDesc: validatedData.reqDesc,
      featureId: validatedData.featureId,
      featureRequest,
      fileContent
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages);
    console.log('[add-user-story] LLM Response:', response);

    let result;
    try {
      const parsed = JSON.parse(response);
      if (!parsed.features || !Array.isArray(parsed.features)) {
        throw new Error('Invalid response structure');
      }
      result = parsed;
    } catch (error) {
      console.error('[add-user-story] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return {
      ...validatedData,
      ...result
    };
  } catch (error) {
    console.error('Error in addUserStory:', error);
    throw error;
  }
}
