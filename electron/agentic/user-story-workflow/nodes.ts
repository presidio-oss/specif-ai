import { HumanMessage } from "@langchain/core/messages";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { refinePrompt } from "../../prompts/feature/evaluation/refine";
import { evaluatePrompt } from "../../prompts/feature/evaluation/evaluate";
import { repairJSON } from "../../utils/custom-json-parser";
import { IUserStoryWorkflowStateAnnotation } from "./state";
import { UserStoryWorkflowRunnableConfig } from "./types";

// Generate Initial Stories Node
export const buildGenerateStoriesNode = (
  modelProvider: LangChainModelProvider
) => {
  return async (
    state: IUserStoryWorkflowStateAnnotation["State"],
    runnableConfig: UserStoryWorkflowRunnableConfig
  ) => {
    const trace = runnableConfig.configurable?.trace;
    const span = trace?.span({
      name: "generate-stories",
    });

    try {
      // Use existing refinePrompt logic
      const prompt = refinePrompt({
        requirements: state.requirements,
        extraContext: state.extraContext,
        technologies: state.technicalDetails,
        features:
          state.stories.length > 0
            ? JSON.stringify({ features: state.stories })
            : undefined,
        evaluation: state.evaluation,
      });

      // LLM Call
      const model = modelProvider.getModel();
      const response = await model.invoke(prompt);

      let parsedStories;
      try {
        // Use existing JSON repair utility
        const responseText =
          typeof response === "string" ? response : response.content.toString();
        let cleanedResponse = repairJSON(responseText);
        parsedStories = JSON.parse(cleanedResponse);
      } catch (error) {
        console.error("Error parsing LLM response:", error);
        span?.end({
          level: "ERROR",
          statusMessage: `Error parsing LLM response: ${error}`,
        });
        throw new Error("Invalid response format from LLM");
      }

      console.log("[user-story-node] Successfully parsed stories:", {
        storiesCount: parsedStories.features?.length || 0,
      });

      span?.end({
        statusMessage: "Successfully generated user stories",
      });

      return {
        stories: parsedStories.features || [],
        feedbackLoops: state.feedbackLoops + 1,
        messages: [...state.messages, new HumanMessage(prompt)],
      };
    } catch (error) {
      const message = `[user-story-workflow] Error in generate-stories node: ${error}`;
      console.error(message, error);
      span?.end({
        level: "ERROR",
        statusMessage: message,
      });

      // Return current state to avoid breaking the workflow
      return {
        feedbackLoops: state.feedbackLoops + 1,
        isComplete: true, // Force completion on error
      };
    }
  };
};

// Evaluate Stories Node
export const buildEvaluateStoriesNode = (
  modelProvider: LangChainModelProvider
) => {
  return async (
    state: IUserStoryWorkflowStateAnnotation["State"],
    runnableConfig: UserStoryWorkflowRunnableConfig
  ) => {
    const trace = runnableConfig.configurable?.trace;
    const span = trace?.span({
      name: "evaluate-stories",
    });

    try {
      if (state.stories.length === 0) {
        const message = "No stories to evaluate";
        span?.end({
          statusMessage: message,
        });

        return {
          evaluation: message,
          isComplete: true,
        };
      }

      // Use existing evaluatePrompt
      const prompt = evaluatePrompt({
        requirements: state.requirements,
        features: JSON.stringify(state.stories),
      });

      const model = modelProvider.getModel();
      const response = await model.invoke(prompt);

      // Check if approved
      const responseText =
        typeof response === "string" ? response : response.content.toString();
      const isApproved = responseText.includes(
        "APPROVED AND READY FOR REFINEMENT"
      );

      span?.end({
        statusMessage: isApproved
          ? "Stories approved"
          : "Stories need refinement",
      });

      const isComplete = isApproved || state.feedbackLoops >= 3;

      return {
        evaluation: response,
        isComplete: isComplete, // Max 3 feedback loops
        messages: [...state.messages, new HumanMessage(prompt)],
      };
    } catch (error) {
      const message = `Error in evaluate-stories node: ${error}`;
      console.error(message, error);
      span?.end({
        level: "ERROR",
        statusMessage: message,
      });

      // Return current state to avoid breaking the workflow
      return {
        isComplete: true, // Force completion on error
      };
    }
  };
};

// Decide whether to continue or exit
export const shouldContinueEdge = (
  state: IUserStoryWorkflowStateAnnotation["State"]
) => {
  if (state.isComplete) {
    return "complete";
  }
  return "needs_refinement";
};
