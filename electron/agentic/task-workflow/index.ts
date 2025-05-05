import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildGenerateTasksNode, buildResearchNode } from "./nodes";
import { TaskWorkflowStateAnnotation } from "./state";

type CreateTaskWorkflowParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createTaskWorkflow = (params: CreateTaskWorkflowParams) => {
  const { model, tools, checkpointer } = params;

  const builder = new StateGraph(TaskWorkflowStateAnnotation)
    .addNode("research", buildResearchNode({ model, tools, checkpointer }))
    .addNode("generate_tasks", buildGenerateTasksNode(model))
    .addEdge(START, "research")
    .addEdge("research", "generate_tasks")
    .addEdge("generate_tasks", END);

  const graph = builder.compile({ checkpointer: checkpointer });
  return graph;
};
