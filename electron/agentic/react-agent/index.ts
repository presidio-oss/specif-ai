import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import {
  buildGenerateStructuredResponseNode,
  buildLLMNode,
  buildSummarizeNode,
  MessageSummaryConfig,
  shouldContinueEdge,
} from "./nodes";
import { createReactAgentAnnotation } from "./state";
import { IResponseFormatInput } from "./types";

type BuildReactAgentParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  responseFormat?: IResponseFormatInput;
  summaryConfig?: MessageSummaryConfig;
  checkpointer: BaseCheckpointSaver | false | undefined;
};

export const buildReactAgent = <
  TStructuredResponse extends Record<string, any> = Record<string, any>
>(
  params: BuildReactAgentParams
) => {
  const { model, tools, responseFormat, summaryConfig, checkpointer } = params;

  const builder = new StateGraph(
    createReactAgentAnnotation<TStructuredResponse>()
  )
    .addNode("summarize", buildSummarizeNode(model, summaryConfig))
    .addNode("llm", buildLLMNode(model, tools))
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, "summarize")
    .addEdge("summarize", "llm")
    .addEdge("tools", "summarize");

  if (responseFormat) {
    builder
      .addNode(
        "generate_structured_response",
        buildGenerateStructuredResponseNode(model, responseFormat)
      )
      .addConditionalEdges("llm", shouldContinueEdge, {
        actions: "tools",
        next: "generate_structured_response",
      })
      .addEdge("generate_structured_response", END);
  } else {
    builder.addConditionalEdges("llm", shouldContinueEdge, {
      actions: "tools",
      next: END,
    });
  }

  const graph = builder.compile({
    checkpointer: checkpointer,
  });
  return graph;
};
