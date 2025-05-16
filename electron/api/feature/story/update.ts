import { updateStorySchema, type UpdateStoryResponse } from '../../../schema/feature/story/update.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { updateStoryPrompt } from '../../../prompts/feature/story/update';
import { repairJSON } from '../../../utils/custom-json-parser';
import { traceBuilder } from '../../../utils/trace-builder';
import { COMPONENT, OPERATIONS } from '../../../helper/constants';
import { ObservabilityManager } from '../../../services/observability/observability.manager';
import { HumanMessage } from "@langchain/core/messages";
import { isDevEnv } from '../../../utils/env';

export async function updateStory(event: IpcMainInvokeEvent, data: unknown): Promise<UpdateStoryResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('update-story');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-story] Using LLM config:', llmConfig);
    const validationSpan = trace.span({name: "input-validation"});
    const validatedData = updateStorySchema.parse(data);
    validationSpan.end();

    const prompt = updateStoryPrompt({
      name: validatedData.name,
      description: validatedData.description,
      reqDesc: validatedData.reqDesc,
      featureId: validatedData.featureId,
      existingFeatureDescription: validatedData.existingFeatureDesc,
      newFeatureDescription: validatedData.featureRequest,
      fileContent: validatedData.fileContent
    });

    const messages = await LLMUtils.prepareMessages(prompt);
    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(COMPONENT.STORY, OPERATIONS.UPDATE);
    const llmSpan = trace.span({
      name: "update-user-story",
    });
    
    const generation = llmSpan.generation({
      name: "llm",
      model: llmConfig.activeProvider,
      environment: process.env.APP_ENVIRONMENT,
      input: isDevEnv() ? [new HumanMessage(prompt)] : undefined,
    });

    const response = await handler.invoke(messages, null, traceName);
    console.log('[update-story] LLM Response:', response);

    generation.end({
      output: isDevEnv() ? response : undefined,
    });

    llmSpan.end({
      statusMessage: "Successfully updated user story"
    });

    const cleanFeatures = repairJSON(response.trim());

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
      llmSpan.end({
        level: "ERROR",
        statusMessage: `Error processing LLM response: ${error}`
      });
      throw error;
    }
  } catch (error) {
    console.error('Error in updateStory:', error);
    throw error;
  }
}
