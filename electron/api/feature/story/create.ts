import { createStorySchema, type CreateStoryResponse } from '../../../schema/feature/story/create.schema';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { randomUUID } from "node:crypto";
import { MemorySaver } from "@langchain/langgraph";
import { createUserStoryWorkflow } from '../../../agentic/user-story-workflow';
import { buildLangchainModelProvider } from '../../../services/llm/llm-langchain';
import { ObservabilityManager } from '../../../services/observability/observability.manager';
import { getMcpToolsForActiveProvider } from '../../../mcp';
import { MCPHub } from '../../../mcp/mcp-hub';
import { isLangfuseDetailedTracesEnabled } from '../../../services/observability/observability.util';

export async function createStories(event: IpcMainInvokeEvent, data: unknown): Promise<CreateStoryResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('create-stories');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[create-stories] Using LLM config:', llmConfig);
    const validatedData = createStorySchema.parse(data);

    const {
      appId,
      appName,
      appDescription,
      reqName,
      reqDesc,
      extraContext,
      technicalDetails
    } = validatedData;

    const memoryCheckpointer = new MemorySaver();
    
    let mcpTools = [];
    try {
      const mcpHub = MCPHub.getInstance();
      await mcpHub.setProjectId(appId);
      mcpTools = await getMcpToolsForActiveProvider();
    } catch (error) {
      console.warn("Error getting mcp tools", error);
    }

    const userStoryWorkflow = createUserStoryWorkflow({
      model: buildLangchainModelProvider(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      ),
      tools: [...mcpTools],
      checkpointer: memoryCheckpointer
    });
    
    const initialState = {
      appName,
      appDescription,
      reqName,
      reqDesc,
      extraContext: extraContext || "",
      technicalDetails: technicalDetails || ""
    };
    
    const config = {
      configurable: {
        thread_id: `${randomUUID()}_create_stories`,
        trace: trace,
        sendMessagesInTelemetry: isLangfuseDetailedTracesEnabled(),
      },
    };
    
    const stream = userStoryWorkflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });
    
    for await (const streamEvent of stream) {
      if (streamEvent.event === "on_tool_start") {
        event.sender.send(
          `story:${appId}-workflow-progress`,
          {
            node: "tools",
            type: "mcp",
            message: `Using tool: ${streamEvent.name}`,
            timestamp: Date.now()
          }
        );
      }
        
      if (streamEvent.event === "on_custom_event") {
        event.sender.send(
          `story:${appId}-workflow-progress`,
          streamEvent.data
        );
      }
    }
    
    const response = await userStoryWorkflow.getState({
      ...config
    });
    
    const stories = response.values.stories;
    try {
      const transformedFeatures = stories.map((feature: any) => {
        if (!feature.id || !feature.title || !feature.description) {
          throw new Error(`Invalid feature structure: missing required fields in ${JSON.stringify(feature)}`);
        }
        
        const transformedFeature: { id: string; [key: string]: string } = {
          id: feature.id
        };
        
        transformedFeature[feature.title] = feature.description;
        
        return transformedFeature;
      });
      
      return {
        features: transformedFeatures
      };
    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in createStories:', error);
    throw error;
  }
}
