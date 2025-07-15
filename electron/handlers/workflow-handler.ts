import { ipcMain } from "electron";
import { createTestCaseWorkflow } from "../agentic/test-case-workflow";
import { contentGenerationManager } from "../services/content-generation/content-generation.service";
import { ContentGenerationType } from "../types/content-generation.types";
import { buildLangchainModelProvider } from "../services/llm/llm-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { store } from "../services/store";
import { LLMConfigModel } from "../services/llm/llm-types";
import { ObservabilityManager } from "../services/observability/observability.manager";
import { isLangfuseDetailedTracesEnabled } from "../services/observability/observability.util";
import { randomUUID } from "node:crypto";
import { getMcpToolsForActiveProvider } from "../mcp";
import { MCPHub } from "../mcp/mcp-hub";
import { WorkflowEventsService } from "../services/events/workflow-events.service";

const workflowEvents = new WorkflowEventsService("test-case");

export function setupWorkflowHandlers() {
  ipcMain.handle("workflow:invoke", async (_event, workflowState) => {
    try {
      const { type, userStoryId } = workflowState;

      switch (type) {
        case "test-case": {
          contentGenerationManager.setContentGenerationStatus(
            userStoryId,
            ContentGenerationType.TestCase,
            true
          );
          const o11y = ObservabilityManager.getInstance();
          const trace = o11y.createTrace('generate-test-cases');
          const llmConfig = store.get<LLMConfigModel>('llmConfig');
          if (!llmConfig) {
            throw new Error('LLM configuration not found');
          }
          
          const llm = buildLangchainModelProvider(
            llmConfig.activeProvider,
            llmConfig.providerConfigs[llmConfig.activeProvider].config
          );
          const config = {
            configurable: {
              thread_id: `${randomUUID()}_generate_test_cases`,
              trace: trace,
              sendMessagesInTelemetry: isLangfuseDetailedTracesEnabled(),
            },
          };

          let mcpTools = [];
          try {
            const mcpHub = MCPHub.getInstance();
            await mcpHub.setProjectId(userStoryId);
            mcpTools = await getMcpToolsForActiveProvider();
          } catch (error) {
            console.warn("Error getting mcp tools", error);
          }

          const generateCorrelationId = randomUUID();

          await workflowEvents.dispatchThinking(
            "generate-test-cases",
            {
              title: "Generating test cases based on user story",
            },
            config,
            generateCorrelationId
          );

          const memoryCheckpointer = new MemorySaver();
          const workflow = createTestCaseWorkflow({
            model: llm,
            tools: [...mcpTools],
            checkpointer: memoryCheckpointer
          });

          const stream = workflow.streamEvents(workflowState, {
            version: "v2",
            streamMode: "messages",
            ...config,
          });

          for await (const { event: evt, name, data } of stream) {
            const channel = `test-case:${userStoryId}-workflow-progress`;
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

          const result = await workflow.getState(config);
          
          console.log("[workflow-handler] Generated test cases:", JSON.stringify(result.values.testCases, null, 2));

          await workflowEvents.dispatchAction(
            "generate-test-cases",
            {
              title: `Successfully generated ${result.values.testCases?.length || 0} test cases`,
              output: JSON.stringify(result.values.testCases || []),
            },
            config,
            generateCorrelationId
          );

          contentGenerationManager.setContentGenerationStatus(
            userStoryId,
            ContentGenerationType.TestCase,
            false
          );

          return result.values;
        }
        default:
          throw new Error(`Unknown workflow type: ${type}`);
      }
    } catch (error) {
      console.error("Error in workflow handler:", error);
      if (workflowState.userStoryId) {
        contentGenerationManager.setContentGenerationStatus(
          workflowState.userStoryId,
          ContentGenerationType.TestCase,
          false
        );
      }
      throw error;
    }
  });
}
