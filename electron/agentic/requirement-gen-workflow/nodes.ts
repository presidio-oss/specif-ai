import { HumanMessage, isAIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { IRequirementGenWorkflowStateAnnotation } from "./state";
import { getSchemaForGeneratedRequirements } from "./utils";

export const buildLLMNode = (modelProvider: LangChainModelProvider) => {
  const model = modelProvider.getModel();

  return async (state: IRequirementGenWorkflowStateAnnotation["State"]) => {
    // TODO: we can try using structured output here
    const response = await model.invoke(state.messages);

    return {
      messages: [response],
      feedbackOnRequirements: null,
    };
  };
};

export const parseAndValidateGeneratedRequirementsNode = async (
  state: IRequirementGenWorkflowStateAnnotation["State"]
) => {
  try {
    const lastAIMessage = state.messages[state.messages.length - 1];
    const content = lastAIMessage.content as string;

    let processedResponse = content;
    // For cases where the output json is wrapped in ```json\n<content>\n``` - observed with gemini models
    const jsonWrapperMatch = content.match(/```json\n(.*?)\n```/s);

    if (jsonWrapperMatch != null) {
      processedResponse = jsonWrapperMatch[1];
    }

    const parsedJson = JSON.parse(processedResponse);
    const requirements = parsedJson[state.type.toLowerCase()];

    const outputSchema = getSchemaForGeneratedRequirements(state.type);
    const parsedRequirements = await outputSchema.parseAsync(requirements);

    return {
      requirements: parsedRequirements,
    };
  } catch (error) {
    let errorMessage = `Error parsing the generated requirements json - ${error}.`;

    if (error instanceof z.ZodError) {
      errorMessage += `Failed to parse the requirements you prepared. Error - ${error.toString()}. Please fix them and generate again.`;
    }

    errorMessage +=
      "You must only response JSON. You should not give any explaination before or after JSON.";

    return {
      feedbackLoops: state.feedbackLoops + 1,
      feedbackOnRequirements: `${error}`,
      messages: [new HumanMessage(errorMessage)],
    };
  }
};

// Edges

export const shouldContinueEdge = (
  state: IRequirementGenWorkflowStateAnnotation["State"]
) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (
    lastMessage &&
    isAIMessage(lastMessage) &&
    lastMessage.tool_calls?.length
  ) {
    return "action";
  }

  return "next";
};

export const isTaskCompleteEdge = async (
  state: IRequirementGenWorkflowStateAnnotation["State"]
) => {
  // retry only three times
  if (state.feedbackOnRequirements && state.feedbackLoops < 4) {
    return "generated_with_feedback";
  }

  return "task_complete";
};
