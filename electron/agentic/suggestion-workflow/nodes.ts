import { HumanMessage } from "@langchain/core/messages";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { generateImprovedSuggestionsPrompt } from "../../prompts/core/improved-suggestions";
import { repairJSON } from "../../utils/custom-json-parser";
import { LLMUtils } from "../../services/llm/llm-utils";
import { ISuggestionWorkflowStateAnnotation } from "./state";
import { SuggestionWorkflowRunnableConfig } from "./types";

export const buildGenerateSuggestionsNode = (
  modelProvider: LangChainModelProvider
) => {
  return async (
    state: ISuggestionWorkflowStateAnnotation["State"],
    runnableConfig: SuggestionWorkflowRunnableConfig
  ) => {
    const trace = runnableConfig.configurable?.trace;
    const span = trace?.span({
      name: "generate-suggestions",
    });

    try {
      let prompt = generateImprovedSuggestionsPrompt({
        name: state.name,
        description: state.description,
        type: state.type,
        requirement: state.requirement,
        suggestions: state.suggestions,
        selectedSuggestion: state.selectedSuggestion,
        knowledgeBase: state.knowledgeBase,
        requirementAbbr: state.requirementAbbr,
        brds: state.brds,
      });

      if (state.knowledgeBase && state.bedrockConfig) {
        console.log(
          "[suggestion-workflow] Applying knowledge base constraint..."
        );
        prompt = await LLMUtils.generateKnowledgeBasePromptConstraint(
          state.knowledgeBase,
          prompt,
          state.bedrockConfig
        );
      }

      // LLM Call
      const model = modelProvider.getModel();
      const response = await model.invoke(prompt);

      let improvedSuggestions;
      try {
        const responseText =
          typeof response === "string" ? response : response.content.toString();
        const repairedResponse = repairJSON(responseText);
        improvedSuggestions = JSON.parse(repairedResponse);
        console.log(
          "[suggestion-workflow] LLM response parsed successfully:",
          improvedSuggestions
        );
      } catch (error) {
        console.error(
          "[suggestion-workflow] Error parsing LLM response:",
          error
        );
        span?.end({
          level: "ERROR",
          statusMessage: `Error parsing LLM response: ${error}`,
        });
        throw new Error("Failed to parse LLM response as JSON");
      }

      span?.end({
        statusMessage: "Successfully generated suggestions",
      });

      return {
        suggestions: improvedSuggestions,
        feedbackLoops: state.feedbackLoops + 1,
        isComplete: true,
        messages: [...state.messages, new HumanMessage(prompt)],
      };
    } catch (error) {
      const message = `[suggestion-workflow] Error in generate-suggestions node: ${error}`;
      console.error(message, error);
      span?.end({
        level: "ERROR",
        statusMessage: message,
      });

      // Return current state to avoid breaking the workflow
      return {
        suggestions: [],
        feedbackLoops: state.feedbackLoops + 1,
        isComplete: true, // Force completion on error
      };
    }
  };
};
