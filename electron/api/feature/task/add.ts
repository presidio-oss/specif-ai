import { IpcMainInvokeEvent } from 'electron';
import { addTaskSchema, AddTaskRequest, AddTaskResponse } from '../../../schema/feature/task/add.schema';
import { addTaskPrompt } from '../../../prompts/feature/task/add';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { repairJSON } from '../../../utils/custom-json-parser';
import { OPERATIONS, COMPONENT } from '../../../helper/constants';
import { traceBuilder } from '../../../utils/trace-builder';
import { ObservabilityManager } from '../../../services/observability/observability.manager';
import { HumanMessage } from "@langchain/core/messages";
import { isLangfuseDetailedTracesEnabled } from '../../../services/observability/observability.util';

export async function addTask(event: IpcMainInvokeEvent, data: any): Promise<AddTaskResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('add-task');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[add-task] Using LLM config:', llmConfig);
    const validationSpan = trace.span({name: "input-validation"});
    const validatedData = addTaskSchema.parse(data) as AddTaskRequest;
    validationSpan.end();

    // Generate prompt
    const prompt = addTaskPrompt({
      name: validatedData.name,
      description: validatedData.description,
      taskId: validatedData.taskId,
      taskName: validatedData.taskName,
      taskDescription: validatedData.reqDesc,
      fileContent: validatedData.fileContent
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(COMPONENT.TASK, OPERATIONS.ADD);
    const llmSpan = trace.span({
      name: "add-task",
    });
    
    const generation = llmSpan.generation({
      name: "llm",
      model: llmConfig.activeProvider,
      environment: process.env.APP_ENVIRONMENT,
      input: isLangfuseDetailedTracesEnabled() ? [new HumanMessage(prompt)] : undefined,
    });

    const response = await handler.invoke(messages, null, traceName);
    console.log('[add-task] LLM Response:', response);

    generation.end({
      output: isLangfuseDetailedTracesEnabled() ? response : undefined,
    });

    llmSpan.end({
      statusMessage: "Successfully generated task"
    });

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
      llmSpan.end({
        level: "ERROR",
        statusMessage: `Error parsing LLM response: ${error}`
      });
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
