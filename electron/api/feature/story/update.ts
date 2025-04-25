import { updateStorySchema, type UpdateStoryResponse } from '../../../schema/feature/story/update.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { updateStoryPrompt } from '../../../prompts/feature/story/update';
import { repairJSON } from '../../../utils/custom-json-parser';
import { traceBuilder } from '../../../utils/trace-builder';
import { COMPONENT, DbDocumentType, OPERATIONS, PromptMode } from '../../../helper/constants';

export async function updateStory(event: IpcMainInvokeEvent, data: unknown): Promise<UpdateStoryResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-story] Using LLM config:', llmConfig);
    const validatedData = updateStorySchema.parse(data);

    // TODO: These are currently having placeholders/dummy values to avoid build errors - since we'll be deprecating this api layer
    const prompt = updateStoryPrompt({
      prdName: validatedData.name,
      prdDescription: validatedData.description,
      documentData: {
        id: validatedData.featureId,
        name: validatedData.existingFeatureTitle,
        description: validatedData.existingFeatureDesc,
        documentTypeId: DbDocumentType.USER_STORY
      },
      fileContent: validatedData.fileContent,
      mode: PromptMode.UPDATE,
      newStoryDescription: validatedData.featureRequest
    });

    const messages = await LLMUtils.prepareMessages(prompt);
    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(COMPONENT.STORY, OPERATIONS.UPDATE);
    const response = await handler.invoke(messages, null, traceName);
    const cleanFeatures = repairJSON(response.trim());
    
    console.log('[update-story] LLM Response:', response);

    try {
      const parsedResponse = JSON.parse(cleanFeatures.trim());
      if (!parsedResponse.features || !Array.isArray(parsedResponse.features)) {
        throw new Error('Invalid response structure: missing features array');
      }

      return {
        ...validatedData,
        features: parsedResponse.features
      };
    } catch (error) {
      console.error('Error processing LLM response:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateStory:', error);
    throw error;
  }
}
