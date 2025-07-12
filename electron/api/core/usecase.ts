import { IpcMainInvokeEvent } from "electron/main";
import { createUseCaseWorkflow } from "../../agentic/usecase-workflow";
import { createUseCaseWorkflowTools } from "../../agentic/usecase-workflow/tools";
import { getMcpToolsForActiveProvider } from "../../mcp";
import { buildLangchainModelProvider } from "../../services/llm/llm-langchain";
import { LLMConfigModel } from "../../services/llm/llm-types";
import { ObservabilityManager } from "../../services/observability/observability.manager";
import { store } from "../../services/store";
import { isLangfuseDetailedTracesEnabled } from '../../services/observability/observability.util';
import { WorkflowEventsService, WorkflowEventType } from "../../services/events/workflow-events.service";
import { MemorySaver } from "@langchain/langgraph";

interface UseCaseGenerationRequest {
  project?: {
    name?: string;
    description?: string;
    solution?: {
      solutionId?: string;
      name?: string;
      description?: string;
      techDetails?: string;
    };
  };
  requirement?: {
    title?: string;
    description?: string;
    researchUrls?: string[];
  };
}

export const generateUseCase = async (_event: IpcMainInvokeEvent, data: unknown) => {
  const request = data as Partial<UseCaseGenerationRequest>;
  try {
    const workflowEvents = new WorkflowEventsService("usecase");
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('generate-usecase');

    const llmConfig = store.get<LLMConfigModel>('llmConfig');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    const model = buildLangchainModelProvider(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const mcpTools = await getMcpToolsForActiveProvider();
    const customTools = createUseCaseWorkflowTools();
    const allTools = [...mcpTools, ...customTools];
    
    const memoryCheckpointer = new MemorySaver();
    
    const workflow = createUseCaseWorkflow({
      model: model,
      tools: allTools,
      checkpointer: memoryCheckpointer,
    });

    const requestId = request.project?.solution?.solutionId;
    
    const initialState = {
      project: {
        name: request.project?.name || "",
        description: request.project?.description || "",
        solution: {
          id: request.project?.solution?.solutionId,
          name: request.project?.solution?.name || "",
          description: request.project?.solution?.description || "",
          techDetails: request.project?.solution?.techDetails || "",
        }
      },
      requirement: {
        title: request.requirement?.title || "",
        description: request.requirement?.description || "",
        researchUrls: request.requirement?.researchUrls || [],
      },
    };

    const config = {
      configurable: {
        thread_id: `${requestId}_generate_usecase`,
        trace: trace,
        sendMessagesInTelemetry: isLangfuseDetailedTracesEnabled(),
      },
    };
    
    const stream = workflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });
    
    for await (const streamEvent of stream) {
      const channel = `usecase:${requestId}-workflow-progress`;
      
      switch (streamEvent.event) {
        case "on_tool_end":
          const toolEndEvent = workflowEvents.createEvent(
            "tools_end",
            WorkflowEventType.Mcp,
            {
              title: `Executed Tool: ${streamEvent.name}`,
              input: streamEvent.data?.input,
              output: streamEvent.data?.output?.content,
            }
          );
          _event.sender.send(channel, toolEndEvent);
          break;
          
        case "on_custom_event":
          _event.sender.send(channel, streamEvent.data);
          break;
      }
    }
    
    const result = await workflow.getState(config);

    if (!result.values.useCaseDraft || !result.values.useCaseDraft.requirement) {
      throw new Error('Workflow did not return a valid use case draft');
    }
    
    try {
      JSON.parse(`{"test": ${JSON.stringify(result.values.useCaseDraft.requirement)}}`);
      
      const processedRequirement = result.values.useCaseDraft.requirement
        .replace(/\\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/```(markdown|json)?/g, '')
        .trim();
      
      return {
        title: result.values.useCaseDraft.title,
        requirement: processedRequirement,
        status: "success",
        requestId: requestId,
      };
    } catch (jsonError) {
      const cleanedRequirement = result.values.useCaseDraft.requirement
        .replace(/```(markdown|json)?/g, '')
        .replace(/\\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      return {
        title: result.values.useCaseDraft.title,
        requirement: cleanedRequirement,
        status: "success",
        requestId: requestId,
      };
    }
  } catch (error) {
    return {
      title: "Error generating use case",
      requirement: `An error occurred while generating the use case: ${error}`,
      status: "error",
    };
  }
};
