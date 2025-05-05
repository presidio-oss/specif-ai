import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import {
  buildGenerateStoriesNode,
  buildEvaluateStoriesNode,
  shouldContinueEdge,
  buildResearchNode,
} from "./nodes";
import { UserStoryWorkflowStateAnnotation } from "./state";

type CreateUserStoryWorkflowParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createUserStoryWorkflow = (
  params: CreateUserStoryWorkflowParams
) => {
  const { model, tools, checkpointer } = params;

  const builder = new StateGraph(UserStoryWorkflowStateAnnotation)
    .addNode("research", buildResearchNode({ model, tools, checkpointer }))
    .addNode("generate_stories", buildGenerateStoriesNode(model))
    .addNode("evaluate_stories", buildEvaluateStoriesNode(model))
    .addEdge(START, "research")
    .addEdge("research", "generate_stories")
    .addEdge("generate_stories", "evaluate_stories")
    .addConditionalEdges("evaluate_stories", shouldContinueEdge, {
      needs_refinement: "generate_stories",
      complete: END,
    });

  const graph = builder.compile({ checkpointer: checkpointer });
  return graph;
};
