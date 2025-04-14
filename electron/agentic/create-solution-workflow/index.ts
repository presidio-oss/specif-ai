import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildReqGenerationNode, buildResearchNode } from "./nodes";
import { CreateSolutionStateAnnotation } from "./state";

type CreateSolutionWorkflowParams = {
  tools: Array<ITool>;
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false;
};

export const buildCreateSolutionWorkflow = ({
  tools,
  model,
  checkpointer,
}: CreateSolutionWorkflowParams) => {
  const builder = new StateGraph(CreateSolutionStateAnnotation)
    .addNode("research", buildResearchNode({ model, tools }))
    .addNode("generate_prd", buildReqGenerationNode({ type: "PRD", model }))
    .addNode("generate_brd", buildReqGenerationNode({ type: "BRD", model }))
    .addNode("generate_uir", buildReqGenerationNode({ type: "UIR", model }))
    .addNode("generate_nfr", buildReqGenerationNode({ type: "NFR", model }))
    // do research and then generate requirements with the findings
    .addEdge(START, "research")
    .addEdge("research", "generate_brd")
    .addEdge("research", "generate_uir")
    .addEdge("research", "generate_nfr")
    .addEdge("generate_brd", "generate_prd")
    .addEdge("generate_prd", END);

  const workflow = builder.compile({
    checkpointer: checkpointer,
  });

  return workflow;
};
