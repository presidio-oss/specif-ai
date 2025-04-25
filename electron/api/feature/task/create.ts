import { IpcMainInvokeEvent } from 'electron';
import { createTaskSchema, CreateTaskRequest, CreateTaskResponse } from '../../../schema/feature/task/create.schema';
import { store } from '../../../services/store';
import { COMPONENT, OPERATIONS } from '../../../helper/constants';
import { traceBuilder } from '../../../utils/trace-builder';
import { createTaskWorkflow } from '../../../agentic/task-workflow';
import { buildLangchainModelProvider } from '../../../services/llm/llm-langchain';
import { MemorySaver } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import { ObservabilityManager } from '../../../services/observability/observability.manager';
import { LLMConfigModel } from '../../../services/llm/llm-types';

export async function createTask(event: IpcMainInvokeEvent, data: any): Promise<CreateTaskResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('create-task');
    
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }
    
    console.log('[create-task] Using LLM config:', llmConfig);
    const validatedData = createTaskSchema.parse(data) as CreateTaskRequest;
    
    const memoryCheckpointer = new MemorySaver();
    
    const taskWorkflow = createTaskWorkflow({
      model: buildLangchainModelProvider(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      ),
      checkpointer: memoryCheckpointer
    });
    
    const initialState = {
      name: validatedData.name,
      userStory: validatedData.description,
      technicalDetails: validatedData.technicalDetails || "",
      extraContext: validatedData.extraContext || ""
    };
    
    const config = {
      "configurable": {
        "thread_id": `${randomUUID()}_create_tasks`,
        "trace": trace
      }
    };
    
    const stream = taskWorkflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });
    
    for await (const event of stream) {
    }
    
    const response = await taskWorkflow.getState({
      ...config
    });
    
    const tasks = response.values.tasks;
    
    try {
      const transformedTasks = tasks.map((task: any) => {
        if (!task.id || !task.name || !task.acceptance) {
          throw new Error(`Invalid task structure: missing required fields in ${JSON.stringify(task)}`);
        }
        
        const transformedTask: { id: string; [key: string]: string } = {
          id: task.id
        };
        
        transformedTask[task.name] = task.acceptance;
        return transformedTask;
      });
      
      return {
        ...validatedData,
        tasks: transformedTasks,
        reqDesc: validatedData.description
      };
    } catch (error) {
      console.error('[create-task] Error processing response:', error);
      throw new Error('Failed to process workflow response');
    }
  } catch (error) {
    console.error('Error in createTask:', error);
    throw error;
  }
}
