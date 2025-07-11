import { IpcMainInvokeEvent } from "electron";
import { v4 as uuidv4 } from "uuid";
import { InlineEditPayload, InlineEditResponse } from "../../schema/core/inline-edit.schema";
import { buildLangchainModelProvider } from "../../services/llm/llm-langchain";
import { store } from "../../services/store";
import { LLMConfigModel } from "../../services/llm/llm-types";
import { ObservabilityManager } from "../../services/observability/observability.manager";
import { createInlineEditWorkflow } from "../../agentic/inline-edit-workflow";
import { MemorySaver } from "@langchain/langgraph";
import { EventEmitter } from "events";

/**
 * Handles inline text editing requests using AI
 * @param event The IPC event
 * @param payload The inline edit payload
 * @returns The edited text response
 */
export async function inlineEditWithAI(
  event: IpcMainInvokeEvent,
  payload: InlineEditPayload
): Promise<InlineEditResponse> {
  try {
    const requestId = payload.requestId || uuidv4();
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('inline-edit');
    
    // Get LLM configuration
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }
    
    // Create the model provider
    const model = buildLangchainModelProvider(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );
    
    // Create memory checkpointer
    const memoryCheckpointer = new MemorySaver();
    
    // Create the workflow
    const inlineEditWorkflow = createInlineEditWorkflow({
      model,
      checkpointer: memoryCheckpointer
    });
    
    // Set up event emitter for streaming
    const eventEmitter = new EventEmitter();
    eventEmitter.on("data", (data) => {
      event.sender.send(`core:${requestId}-chatStream`, data);
    });
    
    // Initial state
    const initialState = {
      selectedText: payload.selectedText,
      userPrompt: payload.userPrompt,
      context: payload.context || "",
      preserveFormatting: payload.preserveFormatting || false,
      messages: []
    };
    
    // Configuration
    const config = {
      configurable: {
        thread_id: `${requestId}_inline_edit`,
        trace: trace,
        sendMessagesInTelemetry: false,
      },
    };
    
    // Stream events to the client
    const stream = inlineEditWorkflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "updates",
      ...config,
    });
    
    for await (const event_data of stream) {
      // Forward events to the client
      eventEmitter.emit("data", event_data);
    }
    
    // Get the final state
    const response = await inlineEditWorkflow.getState({
      ...config
    });
    
    // Return the response
    console.log("Inline edit response:", response);
    return {
      requestId,
      editedText: response.values.editedText || "",
      success: true,
    };
  } catch (error: any) {
    console.error("Error in inlineEditWithAI:", error);
    return {
      requestId: payload.requestId || uuidv4(),
      editedText: "",
      success: false,
      error: error.message || "Failed to generate edited text",
    };
  }
}
