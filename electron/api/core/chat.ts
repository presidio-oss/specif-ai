import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { IpcMainInvokeEvent } from "electron/main";
import { buildReactAgent } from "../../agentic/react-agent";
import { getMcpToolsForActiveProvider } from "../../mcp";
import { chatWithAIPrompt } from "../../prompts/core/chat-with-ai";
import {
  ChatWithAIParams,
  ChatWithAISchema,
} from "../../schema/core/chat-with-ai.schema";
import { buildLangchainModelProvider } from "../../services/llm/llm-langchain";
import { LLMConfigModel } from "../../services/llm/llm-types";
import { ObservabilityManager } from "../../services/observability/observability.manager";
import { store } from "../../services/store";

export const chatWithAI = async (_: IpcMainInvokeEvent, data: unknown) => {
  try {
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace("chat-with-ai");

    const llmConfig = store.get<LLMConfigModel>("llmConfig");

    if (!llmConfig) {
      throw new Error("LLM configuration not found");
    }

    const model = buildLangchainModelProvider(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const validationSpan = trace.span({ name: "input-validation" });
    const validatedData = await ChatWithAISchema.parseAsync(data);
    validationSpan.end();

    const memoryCheckpointer = new MemorySaver();

    const mcpTools = await getMcpToolsForActiveProvider();
    const requirementTools = await buildToolsForRequirement(validatedData);

    const agent = buildReactAgent({
      model: model,
      tools: [...mcpTools, ...requirementTools],
      checkpointer: memoryCheckpointer,
    });

    const config = {
      configurable: {
        thread_id: `${validatedData.requestId}_create_solution`,
        trace: trace,
        requestId: validatedData.requestId,
      },
    };

    const messages = transformToLangchainMessages(validatedData.chatHistory);
    const stream = agent.streamEvents(
      {
        messages: [chatWithAIPrompt(validatedData), ...messages],
      },
      {
        version: "v2",
        ...config,
      }
    );

    for await (const event of stream) {
      _.sender.send(`core:${validatedData.requestId}-chatStream`, event);
    }

    const finalState = await agent.getState({
      ...config,
    });

    const completionEvent = {
      event: "specif.chat.complete",
      state: finalState,
    };

    _.sender.send(
      `core:${validatedData.requestId}-chatStream`,
      completionEvent
    );

    return finalState;
  } catch (error) {
    console.error("[chat-with-ai] error", error);
  }
};

const buildToolsForRequirement = async (data: ChatWithAIParams) => {
  const getCurrentRequirementContent = tool(
    () => {
      return data.requirement.description;
    },
    {
      name: "get_current_requirement_content",
      description: "Get current requirement content",
    }
  );

  const tools = [getCurrentRequirementContent];

  switch (data.requirementAbbr) {
    case "BP": {
      const getLinkedBRDs = tool(
        () => {
          return JSON.stringify(data.brds);
        },
        {
          name: "get_linked_brd",
          description: "Get linked BRDs",
        }
      );

      const getLinkedPRDs = tool(
        () => {
          return JSON.stringify(data.prds);
        },
        {
          name: "get_linked_prd",
          description: "Get linked PRDs",
        }
      );

      tools.push(getLinkedBRDs, getLinkedPRDs);
      break;
    }
    case "PRD": {
      const getLinkedBRDs = tool(
        () => {
          return JSON.stringify(data.brds);
        },
        {
          name: "get_linked_brd",
          description: "Get linked BRDs",
        }
      );

      tools.push(getLinkedBRDs);
      break;
    }
    case "US": {
      const getLinkedPRD = tool(
        () => {
          return data.prd;
        },
        {
          name: "get_linked_prd",
          description: "Get linked PRD",
        }
      );

      tools.push(getLinkedPRD);
      break;
    }
    case "TASK": {
      const getLinkedUS = tool(
        () => {
          return data.userStory;
        },
        {
          name: "get_linked_us",
          description: "Get linked US",
        }
      );

      const getLinkedPRD = tool(
        () => {
          return data.prd;
        },
        {
          name: "get_linked_prd",
          description: "Get linked PRD",
        }
      );

      tools.push(getLinkedUS, getLinkedPRD);
      break;
    }
  }

  return tools;
};

const transformToLangchainMessages = (
  chatHistory: ChatWithAIParams["chatHistory"] = []
) => {
  const langchainMessages =
    chatHistory
      .map((message) => {
        switch (message.type) {
          case "user":
            return new HumanMessage({
              id: message.id,
              content: message.content,
            });
          case "assistant":
            return new AIMessage({
              id: message.id,
              content: message.content,
              tool_calls: message.toolCalls,
            });
          case "tool":
            return new ToolMessage({
              id: message.id,
              content: message.content ?? "",
              name: message.name,
              tool_call_id: message.tool_call_id,
            });
          default:
            return null;
        }
      })
      .filter((x) => x != null) ?? [];

  return langchainMessages;
};
