import {
  HumanMessage,
  isAIMessage,
  isSystemMessage,
  isToolMessage,
  RemoveMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { MessagesAnnotation } from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { summarizeConversation } from "./prompts/summary";
import { IResponseFormatInput, ReactAgentConfig } from "./types";

// Configuration for message summarization
export interface MessageSummaryConfig {
  maxMessages: number; // Number of messages before triggering summarization
  retainLastN: number; // Number of messages to keep after summarization
  preserveStartN: number; // Number of messages to preserve at the start
}

const DEFAULT_SUMMARY_CONFIG: MessageSummaryConfig = {
  maxMessages: 10,
  retainLastN: 6,
  preserveStartN: 0, // By default, don't preserve any messages at start
};

// Node for handling message summarization
export const buildSummarizeNode = (
  modelProvider: LangChainModelProvider,
  tools: Array<ITool>,
  config: MessageSummaryConfig = DEFAULT_SUMMARY_CONFIG
) => {
  const modelWithTools = modelProvider.getChatModel().bindTools!(tools);

  return async (
    state: (typeof MessagesAnnotation)["State"] & {
      conversationSummary?: string;
    },
    runnableConfig?: ReactAgentConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } = runnableConfig?.configurable ?? {};
    const summarizeSpan = trace?.span({
      name: "summarize",
    });

    try {
      const { messages } = state;

      // If we don't have enough messages, return state as is
      if (!messages || messages.length <= config.maxMessages) {
        summarizeSpan?.end({
          statusMessage: "Not enough messages for summarization",
        });
        return {};
      }

      const currentSummary = state.conversationSummary;

      // Add summarization request as a human message
      const allMessages = [
        ...messages,
        new HumanMessage({
          content: summarizeConversation(currentSummary),
        }),
      ];

      const generation = summarizeSpan?.generation({
        name: "summarize",
        model: modelProvider.getModel().id,
        input: sendMessagesInTelemetry ? allMessages : undefined,
      });

      // Generate new summary
      const response = await modelWithTools.invoke(allMessages, {
        signal: runnableConfig?.signal,
      });
      const newSummary =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      generation?.end({
        output: sendMessagesInTelemetry ? response : undefined,
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens,
        },
      });

      // Calculate which messages to keep
      const messagesLength = messages.length;
      const keepLastStartIndex = Math.max(
        0,
        messagesLength - config.retainLastN
      );

      let systemPromptOffset = 0;

      // Always keep system prompt if present
      if (messages.length > 0 && isSystemMessage(messages[0])) {
        systemPromptOffset = 1;
      }

      // Calculate preserved start messages range
      const preserveStartEndIndex = Math.min(
        systemPromptOffset + config.preserveStartN,
        keepLastStartIndex
      );

      // Calculate middle section to be deleted (between preserved start and retained last messages)
      let deleteStartIndex = preserveStartEndIndex;
      let deleteEndIndex = keepLastStartIndex;

      // If first message to be deleted would be a tool message, find and keep its preceding AI message
      if (
        deleteStartIndex < deleteEndIndex &&
        isToolMessage(messages[deleteStartIndex])
      ) {
        for (let i = deleteStartIndex - 1; i >= systemPromptOffset; i--) {
          if (isAIMessage(messages[i])) {
            deleteStartIndex = i;
            break;
          }
        }
      }

      // If first message to be kept in the last section is a tool message,
      // find and keep its preceding AI message
      if (
        deleteEndIndex > deleteStartIndex &&
        isToolMessage(messages[deleteEndIndex])
      ) {
        for (let i = deleteEndIndex - 1; i >= deleteStartIndex; i--) {
          if (isAIMessage(messages[i])) {
            deleteEndIndex = i;
            break;
          }
        }
      }

      // Create list of messages to delete
      const deleteMessages = messages
        .slice(deleteStartIndex, deleteEndIndex)
        .map((m) => new RemoveMessage({ id: m.id! }));

      summarizeSpan?.end();

      return {
        conversationSummary: newSummary,
        messages: deleteMessages,
      };
    } catch (error) {
      console.error("[react-agent] Error in summarize node:", error);
      summarizeSpan?.end({
        level: "ERROR",
      });
      throw error;
    }
  };
};

// Node for handling LLM interactions
export const buildLLMNode = (
  modelProvider: LangChainModelProvider,
  tools: Array<ITool>
) => {
  const modelWithTools = modelProvider.getChatModel().bindTools!(tools);

  return async (
    state: (typeof MessagesAnnotation)["State"] & {
      conversationSummary?: string;
    },
    runnableConfig?: ReactAgentConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig?.configurable ?? {};

    const llmSpan = trace?.span({
      name: "llm",
    });

    try {
      let messages = state["messages"];

      // If there is a summary, add it as a system message
      if (state.conversationSummary) {
        if (isSystemMessage(messages[0])) {
          messages = [
            messages[0],
            new HumanMessage(
              `Summary of the conversation before the following messages: ${state.conversationSummary}`
            ),
            ...messages.slice(1),
          ];
        } else {
          messages = [
            new SystemMessage(state.conversationSummary),
            ...messages,
          ];
        }
      }

      const generation = llmSpan?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        input: sendMessagesInTelemetry ? messages : undefined,
      });

      const response = await modelWithTools.invoke(messages, {
        signal: runnableConfig?.signal,
      });

      // FIX for bedrock - duplicate tool_use calls issue - to test for other ones as well
      if (typeof response.content !== "string") {
        response.content = response.content.filter(
          (c) => c.type !== "tool_use"
        );
      }

      generation?.end({
        output: sendMessagesInTelemetry ? response : undefined,
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens,
        },
      });

      llmSpan?.end();

      return {
        messages: [response],
      };
    } catch (error) {
      console.error("[react-agent] Error in LLM node:", error);
      llmSpan?.end({
        level: "ERROR",
      });
      throw error;
    }
  };
};

// Node for generating structured responses
export const buildGenerateStructuredResponseNode = (
  modelProvider: LangChainModelProvider,
  responseFormat: IResponseFormatInput
) => {
  const model = modelProvider.getChatModel();

  return async (
    state: (typeof MessagesAnnotation)["State"],
    runnableConfig?: ReactAgentConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig?.configurable ?? {};

    const structuredResponseSpan = trace?.span({
      name: "Structured Response",
    });

    try {
      if (responseFormat == null) {
        structuredResponseSpan?.end({
          statusMessage: "No response format provided",
        });
        return {};
      }

      const messages = [...state.messages];

      let modelWithStructuredOutput;

      if (
        typeof responseFormat === "object" &&
        "prompt" in responseFormat &&
        "schema" in responseFormat
      ) {
        const { prompt, schema } = responseFormat;
        modelWithStructuredOutput = model.withStructuredOutput(schema);
        messages.unshift(new SystemMessage({ content: prompt }));
      } else {
        modelWithStructuredOutput = model.withStructuredOutput(responseFormat);
      }

      const generation = structuredResponseSpan?.generation({
        input: sendMessagesInTelemetry ? messages : undefined,
        model: modelProvider.getModel().provider,
      });

      const response = await modelWithStructuredOutput.invoke(messages, {
        signal: runnableConfig?.signal,
      });

      generation?.end({
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens,
        },
      });

      structuredResponseSpan?.end();

      return { structuredResponse: response };
    } catch (error) {
      console.error(
        "[react-agent] Error in generate structured response node:",
        error
      );
      structuredResponseSpan?.end({
        level: "ERROR",
      });
      throw error;
    }
  };
};

// Edge condition for checking if tools are needed
export const shouldContinueEdge = async (
  state: (typeof MessagesAnnotation)["State"]
) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (isAIMessage(lastMessage) && lastMessage.tool_calls?.length) {
    return "actions";
  }

  return "next";
};
