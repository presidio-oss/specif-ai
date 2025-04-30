import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { buildGenerateTasksNode } from "./nodes";
import { TaskWorkflowStateAnnotation } from "./state";

type CreateTaskWorkflowParams = {
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createTaskWorkflow = (params: CreateTaskWorkflowParams) => {
  const { model, checkpointer } = params;

  const builder = new StateGraph(TaskWorkflowStateAnnotation)
    .addNode("generate_tasks", buildGenerateTasksNode(model))
    .addEdge(START, "generate_tasks")
    .addEdge("generate_tasks", END);

  const graph = builder.compile({ checkpointer: checkpointer });
  return graph;
};
