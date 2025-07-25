import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { buildInlineEditNode } from "./nodes";
import { InlineEditWorkflowStateAnnotation } from "./state";

type CreateInlineEditWorkflowParams = {
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createInlineEditWorkflow = (
  params: CreateInlineEditWorkflowParams
) => {
  const { model, checkpointer } = params;

  const builder = new StateGraph(InlineEditWorkflowStateAnnotation)
    .addNode("inline_edit", buildInlineEditNode(model))
    .addEdge(START, "inline_edit")
    .addEdge("inline_edit", END);

  const graph = builder.compile({ checkpointer: checkpointer });
  return graph;
};
