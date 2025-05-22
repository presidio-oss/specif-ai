import { IpcMainInvokeEvent } from 'electron';
import { addUserStorySchema, AddUserStoryRequest, AddUserStoryResponse } from '../../../schema/feature/story/add.schema';
import { addUserStoryPrompt } from '../../../prompts/feature/story/add';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { repairJSON } from '../../../utils/custom-json-parser';
import { traceBuilder } from '../../../utils/trace-builder';
import { COMPONENT, OPERATIONS } from '../../../helper/constants';
import { ObservabilityManager } from '../../../services/observability/observability.manager';
import { HumanMessage } from "@langchain/core/messages";
import { isLangfuseDetailedTracesEnabled } from '../../../services/observability/observability.util';

export async function addUserStory(event: IpcMainInvokeEvent, data: unknown): Promise<AddUserStoryResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('add-user-story');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[add-user-story] Using LLM config:', llmConfig);
    const validationSpan = trace.span({name: "input-validation"});
    const validatedData = addUserStorySchema.parse(data) as AddUserStoryRequest;
    validationSpan.end();

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

    const traceName = traceBuilder(COMPONENT.STORY, OPERATIONS.ADD);
    const llmSpan = trace.span({
      name: "add-user-story",
    });
    
    const generation = llmSpan.generation({
      name: "llm",
      model: llmConfig.activeProvider,
      environment: process.env.APP_ENVIRONMENT,
      input: isLangfuseDetailedTracesEnabled() ? [new HumanMessage(prompt)] : undefined,
    });

    const response = await handler.invoke(messages, null, traceName);
    console.log('[add-user-story] LLM Response:', response);

    generation.end({
      output: isLangfuseDetailedTracesEnabled() ? response : undefined,
    });

    llmSpan.end({
      statusMessage: "Successfully generated user story"
    });

    let result;
    try {
      const cleanedResponse = repairJSON(response); 
      const parsed = JSON.parse(cleanedResponse);
      if (!parsed.features || !Array.isArray(parsed.features)) {
        throw new Error('Invalid response structure');
      }
      result = parsed;
    } catch (error) {
      console.error('[add-user-story] Error parsing LLM response:', error);
      llmSpan.end({
        level: "ERROR",
        statusMessage: `Error parsing LLM response: ${error}`
      });
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
