import { IpcMainInvokeEvent } from "electron/main";
import { v4 as uuid } from "uuid";
import { createUseCaseWorkflow } from "../../agentic/usecase-workflow";
import { getMcpToolsForActiveProvider } from "../../mcp";
import { buildLangchainModelProvider } from "../../services/llm/llm-langchain";
import { LLMConfigModel } from "../../services/llm/llm-types";
import { ObservabilityManager } from "../../services/observability/observability.manager";
import { store } from "../../services/store";
import { isLangfuseDetailedTracesEnabled } from '../../services/observability/observability.util';
import { WorkflowEventsService } from "../../services/events/workflow-events.service";
import { MemorySaver } from "@langchain/langgraph";

const workflowEvents = new WorkflowEventsService("usecase");

interface UseCaseGenerationRequest {
  project?: {
    name?: string;
    description?: string;
    solution?: {
      name?: string;
      description?: string;
      techDetails?: string;
    };
  };
  requirement?: {
    title?: string;
    description?: string;
  };
}

export const generateUseCase = async (_event: IpcMainInvokeEvent, data: unknown) => {
  // Type assertion with safety checks
  const request = data as Partial<UseCaseGenerationRequest>;
  try {
    console.log('[generate-usecase] Received request:', request);
    
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
    console.log('[generate-usecase] Got MCP tools:', mcpTools.length);
    
    // Create a memory checkpointer for the workflow
    const memoryCheckpointer = new MemorySaver();
    
    const workflow = createUseCaseWorkflow({
      model: model,
      tools: mcpTools,
      checkpointer: memoryCheckpointer,
    });

    const requestId = uuid();
    const generateCorrelationId = uuid();
    
    const initialState = {
      project: {
        name: request.project?.name || "",
        description: request.project?.description || "",
        solution: {
          name: request.project?.solution?.name || "",
          description: request.project?.solution?.description || "",
          techDetails: request.project?.solution?.techDetails || "",
        }
      },
      requirement: {
        title: request.requirement?.title || "",
        description: request.requirement?.description || "",
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

    // Dispatch initial thinking event
    await workflowEvents.dispatchThinking(
      "generate-usecase",
      {
        title: "Starting business proposal generation",
      },
      config,
      generateCorrelationId
    );

    // Stream the workflow events
    const stream = workflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });

    // Set up a channel for the UI to listen to these events
    const channel = `usecase:${requestId}-workflow-progress`;
    
    // Process the stream events
    for await (const { event: evt, name, data } of stream) {
      const timestamp = Date.now();

      switch (evt) {
        case "on_tool_end":
          _event.sender.send(channel, {
            node: "tools_end",
            type: "mcp",
            message: {
              title: `Completed tool execution: ${name}`,
              input: data?.input,
              output: data?.output?.content,
            },
            timestamp,
          });
          break;

        case "on_custom_event":
          _event.sender.send(channel, data);
          break;
      }
    }

    console.log('[generate-usecase] Getting workflow state...');
    const result = await workflow.getState(config);
    console.log('[generate-usecase] Workflow result:', result);

    if (!result.values.useCaseDraft || !result.values.useCaseDraft.requirement) {
      throw new Error('Workflow did not return a valid use case draft');
    }

    // Dispatch completion event
    await workflowEvents.dispatchAction(
      "generate-usecase",
      {
        title: "Business proposal generated successfully",
        output: {
          title: result.values.useCaseDraft.title,
        }
      },
      config,
      generateCorrelationId
    );

    // Validate that the requirement is properly formatted
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
