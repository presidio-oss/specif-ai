import { isAIMessage, SystemMessage } from "@langchain/core/messages";
import { MessagesAnnotation } from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { IResponseFormatInput } from "./types";

// Node

export const buildLLMNode = (
  modelProvider: LangChainModelProvider,
  tools: Array<ITool>
) => {
  const modelWithTools = modelProvider.getModel().bindTools!(tools);

  return async (state: (typeof MessagesAnnotation)["State"]) => {
    const response = await modelWithTools.invoke(state.messages);

    // FIX for bedrock - duplicate tool_use calls issue - to test for other ones as well
    if (typeof response.content !== "string") {
      response.content = response.content.filter((c) => c.type !== "tool_use");
    }

    return {
      messages: response,
    };
  };
};

export const buildGenerateStructuredResponseNode = (
  modelProvider: LangChainModelProvider,
  responseFormat: IResponseFormatInput
) => {
  const model = modelProvider.getModel();

  return async (state: (typeof MessagesAnnotation)["State"]) => {
    if (responseFormat == null) {
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

    return { structuredResponse: response };
  };
};

// Edges

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
