import { IpcMainInvokeEvent } from "electron/main";
import { v4 as uuid } from "uuid";
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
  // Type assertion with safety checks
  const request = data as Partial<UseCaseGenerationRequest>;
  try {
    console.log('[generate-usecase] Received request:', request);
    
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

    // Get MCP tools and add our custom tools
    const mcpTools = await getMcpToolsForActiveProvider();
    const customTools = createUseCaseWorkflowTools();
    const allTools = [...mcpTools, ...customTools];
    console.log('[generate-usecase] Got tools:', allTools.length);
    console.log('[generate-usecase] Custom tools:', customTools.map(tool => tool.name));
    console.log('[generate-usecase] MCP tools:', mcpTools.length);
    
    // Create a memory checkpointer for the workflow
    const memoryCheckpointer = new MemorySaver();
    
    const workflow = createUseCaseWorkflow({
      model: model,
      tools: allTools,
      checkpointer: memoryCheckpointer,
    });

    const requestId = request.project?.solution?.solutionId;
    // const generateCorrelationId = uuid();
    
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

    console.log('[generate-usecase] Initial state:', initialState);

    const config = {
      configurable: {
        thread_id: `${requestId}_generate_usecase`,
        trace: trace,
        sendMessagesInTelemetry: isLangfuseDetailedTracesEnabled(),
      },
    };
    
    // Stream the workflow events
    const stream = workflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });
    
    console.log('[generate-usecase] Processing workflow events...');
    
    // Process all stream events before getting the final state
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
    
    console.log('[generate-usecase] All workflow events processed, getting final state...');
    const result = await workflow.getState(config);
    console.log('[generate-usecase] Workflow result:', result);

    if (!result.values.useCaseDraft || !result.values.useCaseDraft.requirement) {
      throw new Error('Workflow did not return a valid use case draft');
    }
    
    try {
      // Check if the content is valid by attempting to parse it as JSON
      // This is just a validation step, not actually using the parsed result
      JSON.parse(`{"test": ${JSON.stringify(result.values.useCaseDraft.requirement)}}`);
      
      // Process the requirement to ensure proper line breaks
      const processedRequirement = result.values.useCaseDraft.requirement
        // Replace escaped newlines with actual newlines
        .replace(/\\n/g, '\n')
        // Ensure proper spacing between sections
        .replace(/\n{3,}/g, '\n\n')
        // Remove code block markers if they exist
        .replace(/```(markdown|json)?/g, '')
        .trim();
      
      return {
        title: result.values.useCaseDraft.title,
        requirement: processedRequirement,
        status: "success",
        requestId: requestId, // Return the requestId so the UI can listen for events
      };
    } catch (jsonError) {
      console.error('[generate-usecase] JSON validation error:', jsonError);
      
      // If there's a JSON error, try to clean up the content
      const cleanedRequirement = result.values.useCaseDraft.requirement
        .replace(/```(markdown|json)?/g, '') // Remove code block markers
        .replace(/\\n/g, '\n') // Replace escaped newlines with actual newlines
        .replace(/\n{3,}/g, '\n\n') // Ensure proper spacing between sections
        .trim();
      
      return {
        title: result.values.useCaseDraft.title,
        requirement: cleanedRequirement,
        status: "success",
        requestId: requestId, // Return the requestId so the UI can listen for events
      };
    }
  } catch (error) {
    console.error('[generate-usecase] error', error);
    return {
      title: "Error generating use case",
      requirement: `An error occurred while generating the use case: ${error}`,
      status: "error",
    };
  }
};
