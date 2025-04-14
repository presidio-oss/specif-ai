import { END, START, StateGraph } from "@langchain/langgraph";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import {
  buildLLMNode,
  isTaskCompleteEdge,
  parseAndValidateGeneratedRequirementsNode,
} from "./nodes";
import { RequirementGenWorkflowStateAnnotation } from "./state";

type CreateRequirementGenWorkflowParams = {
  model: LangChainModelProvider;
};

export const createRequirementGenWorkflow = (
  params: CreateRequirementGenWorkflowParams
) => {
  const { model } = params;

  const builder = new StateGraph(RequirementGenWorkflowStateAnnotation)
    .addNode("generate_requirements", buildLLMNode(model))
    .addNode(
      "validate_generated_requirements",
      parseAndValidateGeneratedRequirementsNode
    )
    .addEdge(START, "generate_requirements")
    .addEdge("generate_requirements", "validate_generated_requirements")
    .addConditionalEdges(
      "validate_generated_requirements",
      isTaskCompleteEdge,
      {
        generated_with_feedback: "generate_requirements",
        task_complete: END,
      }
    );

  const graph = builder.compile();
  return graph;
};
