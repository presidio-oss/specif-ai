import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { buildGenerateSuggestionsNode } from "./nodes";
import { SuggestionWorkflowStateAnnotation } from "./state";

type CreateSuggestionWorkflowParams = {
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createSuggestionWorkflow = (
  params: CreateSuggestionWorkflowParams
) => {
  const { model, checkpointer } = params;

  const builder = new StateGraph(SuggestionWorkflowStateAnnotation)
    .addNode("generate_suggestions", buildGenerateSuggestionsNode(model))
    .addEdge(START, "generate_suggestions")
    .addEdge("generate_suggestions", END);

  const graph = builder.compile({ checkpointer: checkpointer });
  return graph;
};
