import { IpcMainInvokeEvent } from 'electron';
import { updateTaskSchema, UpdateTaskRequest, UpdateTaskResponse } from '../../schema/task/update.schema';
import { updateTaskPrompt } from '../../prompts/task/update';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { LLMConfigModel } from '../../services/llm/llm-types';

export async function updateTask(event: IpcMainInvokeEvent, data: any): Promise<UpdateTaskResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-task] Using LLM config:', llmConfig);
    const validatedData = updateTaskSchema.parse(data) as UpdateTaskRequest;

    // Generate prompt
    const prompt = updateTaskPrompt({
      name: validatedData.name,
      description: validatedData.description,
      taskId: validatedData.taskId,
      taskName: validatedData.taskName,
      existingTaskDescription: validatedData.existingTaskDesc,
      taskDescription: validatedData.reqDesc,
      fileContent: validatedData.fileContent
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages);
    console.log('[update-task] LLM Response:', response);

    try {
      const parsed = JSON.parse(response);
      if (!parsed.tasks || !Array.isArray(parsed.tasks) || parsed.tasks.length !== 1) {
        throw new Error('Invalid response structure');
      }

      const task = parsed.tasks[0];
      if (!task.id || Object.keys(task).length !== 2) {
        throw new Error(`Invalid task structure: ${JSON.stringify(task)}`);
      }

      const taskName = Object.keys(task).find(key => key !== 'id');
      if (!taskName) {
        throw new Error('Task name not found in response');
      }

      return {
        appId: validatedData.appId,
        description: validatedData.description,
        featureId: validatedData.featureId,
        name: validatedData.name,
        tasks: [{
          id: validatedData.taskId,
          [taskName]: task[taskName]
        }],
        regenerate: false,
        reqDesc: validatedData.reqDesc,
        reqId: validatedData.reqId
      };
    } catch (error) {
      console.error('[update-task] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }
  } catch (error) {
    console.error('Error in updateTask:', error);
    throw error;
  }
}
