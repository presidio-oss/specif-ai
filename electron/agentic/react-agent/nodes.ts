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
import { IResponseFormatInput, ReactAgentConfig } from "./types";

// Configuration for message summarization
export interface MessageSummaryConfig {
  maxMessages: number; // Number of messages before triggering summarization
  retainLastN: number; // Number of messages to keep after summarization
}

const DEFAULT_SUMMARY_CONFIG: MessageSummaryConfig = {
  maxMessages: 10,
  retainLastN: 8,
};

// Node for handling message summarization
export const buildSummarizeNode = (
  modelProvider: LangChainModelProvider,
  config: MessageSummaryConfig = DEFAULT_SUMMARY_CONFIG
) => {
  const model = modelProvider.getModel();

  return async (
    state: (typeof MessagesAnnotation)["State"] & {
      conversationSummary?: string;
    },
    runnableConfig?: ReactAgentConfig
  ) => {
    const trace = runnableConfig?.configurable?.trace;
    const generation = trace?.generation({
      name: "summarize",
      model: modelProvider.getModelInfo().id
    });

    try {
      const { messages } = state;

      // If we don't have enough messages, return state as is
      if (!messages || messages.length <= config.maxMessages) {
        generation?.end({
          statusMessage: "Not enough messages for summarization"
        });
        return {};
      }

      const currentSummary = state.conversationSummary || "";

      // Create summarization prompt based on whether we already have a summary
      const summaryPrompt = currentSummary
        ? `This is the summary of the conversation to date: ${currentSummary}\n\nExtend the summary by taking into account the new messages above:`
        : "Create a summary of the conversation above:";

      // Add summarization request as a human message
      const allMessages = [
        ...messages,
        new HumanMessage({
          content: summaryPrompt,
        }),
      ];

      // Generate new summary
      const response = await model.invoke(allMessages);
      const newSummary =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // Calculate which messages to keep
      let keepStartIndex = messages.length - config.retainLastN;

      let systemPromptOffset = 0;

      // Always keep system prompt if present
      if (messages.length > 0 && isSystemMessage(messages[0])) {
        systemPromptOffset = 1;
        keepStartIndex = Math.max(1, keepStartIndex);
      }

      // If first message to be kept is a tool message, find and keep the preceding AI message with tool_calls
      if (keepStartIndex > systemPromptOffset) {
        const firstKeptMessage = messages[keepStartIndex];
        if (isToolMessage(firstKeptMessage)) {
          // Look backwards to find the AI message with tool_calls
          for (let i = keepStartIndex - 1; i >= systemPromptOffset; i--) {
            if (isAIMessage(messages[i])) {
              keepStartIndex = i;
              break;
            }
          }
        }
      }

      // Create list of messages to delete
      const deleteMessages = messages
        .slice(systemPromptOffset, keepStartIndex)
        .map((m) => new RemoveMessage({ id: m.id! }));

      generation?.end({
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens
        },
      });

      return {
        conversationSummary: newSummary,
        messages: deleteMessages,
      };
    } catch (error) {
      console.error("[react-agent] Error in summarize node:", error);
      generation?.end({
        level: "ERROR"
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
  const modelWithTools = modelProvider.getModel().bindTools!(tools);

  return async (
    state: (typeof MessagesAnnotation)["State"] & {
      conversationSummary?: string;
    },
    runnableConfig?: ReactAgentConfig
  ) => {
    const trace = runnableConfig?.configurable?.trace;
    const generation = trace?.generation({
      name: "llm",
      model: modelProvider.getModelInfo().id
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

      const response = await modelWithTools.invoke(messages);

      // FIX for bedrock - duplicate tool_use calls issue - to test for other ones as well
      if (typeof response.content !== "string") {
        response.content = response.content.filter(
          (c) => c.type !== "tool_use"
        );
      }

      generation?.end({
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens
        }
      });

      return {
        messages: [response],
      };
    } catch (error) {
      console.error("[react-agent] Error in LLM node:", error);
      generation?.end({
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
  const model = modelProvider.getModel();

  return async (
    state: (typeof MessagesAnnotation)["State"],
    runnableConfig?: ReactAgentConfig
  ) => {
    const trace = runnableConfig?.configurable?.trace;
    const generation = trace?.generation({
      name: "generate-structured-response",
      model: modelProvider.getModelInfo().id
    });

    try {
      if (responseFormat == null) {
        generation?.end({
          statusMessage: "No response format provided"
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

      const response = await modelWithStructuredOutput.invoke(messages);

      generation?.end({
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens
        }
      });

      return { structuredResponse: response };
    } catch (error) {
      console.error(
        "[react-agent] Error in generate structured response node:",
        error
      );
      generation?.end({
        level: "ERROR"
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
