import { IpcMainInvokeEvent } from 'electron';
import { updateTaskSchema, UpdateTaskRequest, UpdateTaskResponse } from '../../../schema/feature/task/update.schema';
import { updateTaskPrompt } from '../../../prompts/feature/task/update';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import { repairJSON } from '../../../utils/custom-json-parser';
import { traceBuilder } from '../../../utils/trace-builder';
import { COMPONENT, DbDocumentType, OPERATIONS, PromptMode } from '../../../helper/constants';

export async function updateTask(event: IpcMainInvokeEvent, data: any): Promise<UpdateTaskResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-task] Using LLM config:', llmConfig);
    const validatedData = updateTaskSchema.parse(data) as UpdateTaskRequest;

    // Generate prompt
    // TODO: These are currently having placeholders/dummy values to avoid build errors - since we'll be deprecating this api layer
    const prompt = updateTaskPrompt({
      storyName: validatedData.name,
      storyDescription: validatedData.description,
      documentData: {
        id: validatedData.taskId,
        name: validatedData.taskName,
        description: validatedData.existingTaskDesc,
        documentTypeId: DbDocumentType.TASK
      },
      fileContent: validatedData.fileContent,
      mode: PromptMode.UPDATE,
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(COMPONENT.TASK, OPERATIONS.UPDATE);
    const response = await handler.invoke(messages, null, traceName);
    
    console.log('[update-task] LLM Response:', response);

    try {
      let cleanedResponse = repairJSON(response); 
      const parsed = JSON.parse(cleanedResponse);
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
