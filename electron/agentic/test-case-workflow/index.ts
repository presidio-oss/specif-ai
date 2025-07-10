import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import {
  buildGenerateTestCasesNode,
  buildResearchNode,
  buildEvaluateTestCasesNode,
  shouldContinueEdge,
} from "./nodes";
import { TestCaseWorkflowStateAnnotation } from "./state";

type CreateTestCaseWorkflowParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const createTestCaseWorkflow = (params: CreateTestCaseWorkflowParams) => {
  const { model, tools, checkpointer } = params;

  const builder = new StateGraph(TestCaseWorkflowStateAnnotation)
    .addNode("research", buildResearchNode({ model, tools, checkpointer }))
    .addNode("generate_test_cases", buildGenerateTestCasesNode(model))
    .addNode("evaluate_test_cases", buildEvaluateTestCasesNode(model))
    .addEdge(START, "research")
    .addEdge("research", "generate_test_cases")
    .addEdge("generate_test_cases", "evaluate_test_cases")
    .addConditionalEdges("evaluate_test_cases", shouldContinueEdge, {
      needs_refinement: "generate_test_cases",
      complete: END,
    });

  const graph = builder.compile({ checkpointer: checkpointer });
  return graph;
};
