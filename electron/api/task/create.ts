import { IpcMainInvokeEvent } from 'electron';
import { createTaskSchema, CreateTaskRequest, CreateTaskResponse } from '../../schema/task/create.schema';
import { createTaskPrompt } from '../../prompts/task/create';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { LLMConfigModel } from '../../services/llm/llm-types';

export async function createTask(event: IpcMainInvokeEvent, data: unknown): Promise<CreateTaskResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[create-task] Using LLM config:', llmConfig);
    const validatedData = createTaskSchema.parse(data) as CreateTaskRequest;

    // Generate prompt
    const prompt = createTaskPrompt({
      name: validatedData.name,
      userstories: validatedData.description,
      technologies: validatedData.technicalDetails,
      extraContext: validatedData.extraContext
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages);
    console.log('[create-task] LLM Response:', response);

    let result;
    try {
      const parsed = JSON.parse(response);
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error('Invalid response structure');
      }
      result = parsed;
    } catch (error) {
      console.error('[create-task] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return {
      ...validatedData,
      tasks: result.tasks,
      reqDesc: validatedData.description
    };
  } catch (error) {
    console.error('Error in createTask:', error);
    throw error;
  }
}
