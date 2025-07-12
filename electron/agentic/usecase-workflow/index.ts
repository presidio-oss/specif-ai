import { BaseCheckpointSaver, END, START, StateGraph } from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildResearchNode, buildUseCaseGenerationNode } from "./nodes";
import { UseCaseWorkflowStateAnnotation } from "./state";

type UseCaseWorkflowParams = {
  tools: Array<ITool>;
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createUseCaseWorkflow = ({ tools, model, checkpointer }: UseCaseWorkflowParams) => {
  const builder = new StateGraph(UseCaseWorkflowStateAnnotation)
    .addNode("research", buildResearchNode({ model, tools, checkpointer }))
    .addNode("generate_usecase", buildUseCaseGenerationNode({ model, checkpointer }))
    .addEdge(START, "research")
    .addEdge("research", "generate_usecase")
    .addEdge("generate_usecase", END);

  return builder.compile({ checkpointer });
};
