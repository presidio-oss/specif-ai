import { IpcMainInvokeEvent } from 'electron';
import { updateTaskSchema, UpdateTaskRequest, UpdateTaskResponse } from '../../../schema/feature/task/update.schema';
import { updateTaskPrompt } from '../../../prompts/feature/task/update';
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

export async function updateTask(event: IpcMainInvokeEvent, data: any): Promise<UpdateTaskResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('update-task');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-task] Using LLM config:', llmConfig);
    const validationSpan = trace.span({name: "input-validation"});
    const validatedData = updateTaskSchema.parse(data) as UpdateTaskRequest;
    validationSpan.end();

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

    const traceName = traceBuilder(COMPONENT.TASK, OPERATIONS.UPDATE);
    const llmSpan = trace.span({
      name: "update-task",
    });
    
    const generation = llmSpan.generation({
      name: "llm",
      model: llmConfig.activeProvider,
      environment: process.env.APP_ENVIRONMENT,
      input: isLangfuseDetailedTracesEnabled() ? [new HumanMessage(prompt)] : undefined,
    });

    const response = await handler.invoke(messages, null, traceName);
    
    console.log('[update-task] LLM Response:', response);

    generation.end({
      output: isLangfuseDetailedTracesEnabled() ? response : undefined,
    });

    llmSpan.end({
      statusMessage: "Successfully updated task"
    });

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
      llmSpan.end({
        level: "ERROR",
        statusMessage: `Error parsing LLM response: ${error}`
      });
      throw new Error('Failed to parse LLM response as JSON');
    }
  } catch (error) {
    console.error('Error in updateTask:', error);
    throw error;
  }
}
