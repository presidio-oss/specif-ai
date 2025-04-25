import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import {
  buildGenerateStoriesNode,
  buildEvaluateStoriesNode,
  shouldContinueEdge,
} from "./nodes";
import { UserStoryWorkflowStateAnnotation } from "./state";

type CreateUserStoryWorkflowParams = {
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createUserStoryWorkflow = (params: CreateUserStoryWorkflowParams) => {
  const { model, checkpointer } = params;

  const builder = new StateGraph(UserStoryWorkflowStateAnnotation)
    .addNode("generate_stories", buildGenerateStoriesNode(model))
    .addNode("evaluate_stories", buildEvaluateStoriesNode(model))
    .addEdge(START, "generate_stories")
    .addEdge("generate_stories", "evaluate_stories")
    .addConditionalEdges(
      "evaluate_stories",
      shouldContinueEdge,
      {
        needs_refinement: "generate_stories",
        complete: END,
      }
    );

  const graph = builder.compile({ checkpointer: checkpointer });
  return graph;
};
