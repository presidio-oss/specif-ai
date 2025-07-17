import { BaseCheckpointSaver, END, START, StateGraph } from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildResearchNode, buildStrategicInitiativeGenerationNode } from "./nodes";
import { StrategicInitiativeWorkflowStateAnnotation } from "./state";

type StrategicInitiativeWorkflowParams = {
  tools: Array<ITool>;
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createStrategicInitiativeWorkflow = ({ tools, model, checkpointer }: StrategicInitiativeWorkflowParams) => {
  const builder = new StateGraph(StrategicInitiativeWorkflowStateAnnotation)
    .addNode("research", buildResearchNode({ model, tools, checkpointer }))
    .addNode("generate_strategic_initiative", buildStrategicInitiativeGenerationNode({ model, checkpointer }))
    .addEdge(START, "research")
    .addEdge("research", "generate_strategic_initiative")
    .addEdge("generate_strategic_initiative", END);

  return builder.compile({ checkpointer });
};
