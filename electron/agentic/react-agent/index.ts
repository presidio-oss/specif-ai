import { START, END, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import {
  buildGenerateStructuredResponseNode,
  buildLLMNode,
  shouldContinueEdge,
} from "./nodes";
import { createReactAgentAnnotation } from "./state";
import { IResponseFormatInput } from "./types";

type BuildReactAgentParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  responseFormat?: IResponseFormatInput;
};

export const buildReactAgent = <
  TStructuredResponse extends Record<string, any> = Record<string, any>
>(
  params: BuildReactAgentParams
) => {
  const { model, tools, responseFormat } = params;

  const builder = new StateGraph(
    createReactAgentAnnotation<TStructuredResponse>()
  )
    .addNode("llm", buildLLMNode(model, tools))
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, "llm")
    .addEdge("tools", "llm");

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

  const graph = builder.compile();
  return graph;
};
