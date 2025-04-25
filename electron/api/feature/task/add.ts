import { IpcMainInvokeEvent } from 'electron';
import { addTaskSchema, AddTaskRequest, AddTaskResponse } from '../../../schema/feature/task/add.schema';
import { addTaskPrompt } from '../../../prompts/feature/task/add';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { repairJSON } from '../../../utils/custom-json-parser';
import { OPERATIONS, COMPONENT, PromptMode, DbDocumentType } from '../../../helper/constants';
import { traceBuilder } from '../../../utils/trace-builder';

export async function addTask(event: IpcMainInvokeEvent, data: any): Promise<AddTaskResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[add-task] Using LLM config:', llmConfig);
    const validatedData = addTaskSchema.parse(data) as AddTaskRequest;

    // Generate prompt
    // TODO: These are currently having placeholders/dummy values to avoid build errors - since we'll be deprecating this api layer
    const prompt = addTaskPrompt({
      storyName: validatedData.name,
      storyDescription: validatedData.description,
      documentData: {
        id: validatedData.taskId,
        name: validatedData.taskName,
        description: validatedData.reqDesc,
        documentTypeId: DbDocumentType.TASK
      },
      mode: PromptMode.ADD,
      fileContent: validatedData.fileContent
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(COMPONENT.TASK, OPERATIONS.ADD);
    const response = await handler.invoke(messages, null, traceName);
    
    console.log('[add-task] LLM Response:', response);

    let llmResponseDict;
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

      llmResponseDict = {
        LLMreqt: {
          title: taskName,
          requirement: task[taskName]
        }
      };
    } catch (error) {
      console.error('[add-task] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return {
      appId: validatedData.appId,
      description: validatedData.description,
      featureId: validatedData.featureId,
      name: validatedData.name,
      tasks: [{
        id: validatedData.taskId,
        [llmResponseDict.LLMreqt.title]: llmResponseDict.LLMreqt.requirement
      }],
      regenerate: false,
      reqDesc: validatedData.reqDesc,
      reqId: validatedData.reqId
    };
  } catch (error) {
    console.error('Error in addTask:', error);
    throw error;
  }
}
