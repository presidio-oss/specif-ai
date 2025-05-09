import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildGenerateSuggestionsNode, buildResearchNode } from "./nodes";
import { SuggestionWorkflowStateAnnotation } from "./state";

type CreateSuggestionWorkflowParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createSuggestionWorkflow = (
  params: CreateSuggestionWorkflowParams
) => {
  const { model, tools, checkpointer } = params;

  const builder = new StateGraph(SuggestionWorkflowStateAnnotation)
    .addNode("research", buildResearchNode({ model, tools, checkpointer }))
    .addNode("generate_suggestions", buildGenerateSuggestionsNode(model))
    .addEdge(START, "research")
    .addEdge("research", "generate_suggestions")
    .addEdge("generate_suggestions", END);

  const graph = builder.compile({ checkpointer: checkpointer });
  return graph;
};
