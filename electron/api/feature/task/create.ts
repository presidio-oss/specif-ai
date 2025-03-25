import { IpcMainInvokeEvent } from 'electron';
import { createTaskSchema, CreateTaskRequest, CreateTaskResponse } from '../../../schema/feature/task/create.schema';
import { createTaskPrompt } from '../../../prompts/feature/task/create';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { repairJSON } from '../../../utils/custom-json-parser';

export async function createTask(event: IpcMainInvokeEvent, data: any): Promise<CreateTaskResponse> {
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
      let cleanedResponse = repairJSON(response.trim());
      const parsed = JSON.parse(cleanedResponse);
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error('Invalid response structure');
      }

      const transformedTasks = parsed.tasks.map((task: { id: any; name: string; acceptance: string; }) => {
        if (!task.id || !task.name || !task.acceptance) {
          throw new Error(`Invalid task structure: missing required fields in ${JSON.stringify(task)}`);
        }
        
        const transformedTask: { id: string; [key: string]: string } = {
          id: task.id
        };
        
        transformedTask[task.name] = task.acceptance;        
        return transformedTask;
      });

      result = {
        tasks: transformedTasks
      };
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
