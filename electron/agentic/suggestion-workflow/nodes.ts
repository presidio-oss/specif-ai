import { HumanMessage } from "@langchain/core/messages";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildReactAgent } from "../react-agent";
import { generateImprovedSuggestionsPrompt } from "../../prompts/core/improved-suggestions";
import { repairJSON } from "../../utils/custom-json-parser";
import { LLMUtils } from "../../services/llm/llm-utils";
import { ISuggestionWorkflowStateAnnotation } from "./state";
import { SuggestionWorkflowRunnableConfig } from "./types";
import { createSuggestionResearchInformationPrompt } from "./prompts/research-information";
import { createSummarizeSuggestionResearchPrompt } from "./prompts/summarize-research";

type BuildResearchNodeParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const buildResearchNode = ({
  model,
  tools,
  checkpointer,
}: BuildResearchNodeParams) => {
  return async (
    state: ISuggestionWorkflowStateAnnotation["State"],
    runnableConfig: SuggestionWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig.configurable ?? {};
    const span = trace?.span({
      name: "research",
    });

    if (tools.length === 0) {
      const message = "No tools are passed so skipping research phase";
      span?.end({
        statusMessage: message,
      });

      return {
        referenceInformation: "",
      };
    }

    const agent = buildReactAgent({
      model: model,
      tools: tools,
      responseFormat: {
        prompt: createSummarizeSuggestionResearchPrompt({
          name: state.name,
          description: state.description,
          type: state.type,
          requirement: state.requirement,
          requirementAbbr: state.requirementAbbr,
          knowledgeBase: state.knowledgeBase,
        }),
        schema: z.object({
          referenceInformation: z.string(),
        }),
      },
      checkpointer: checkpointer,
    });

    // max(min(64, each tool called twice (for each tool call - llm node + tool node + trim messages node) so 3) + 1 (for structured output)), 128)
    const recursionLimit = Math.min(
      Math.max(64, tools.length * 2 * 3 + 1),
      128
    );

    const response = await agent.invoke(
      {
        messages: [
          createSuggestionResearchInformationPrompt({
            name: state.name,
            description: state.description,
            type: state.type,
            requirement: state.requirement,
            requirementAbbr: state.requirementAbbr,
            knowledgeBase: state.knowledgeBase,
            recursionLimit: recursionLimit,
          }),
        ],
      },
      {
        recursionLimit: recursionLimit,
        configurable: {
          trace: span,
          thread_id: runnableConfig.configurable?.thread_id,
          sendMessagesInTelemetry: sendMessagesInTelemetry,
        },
      }
    );

    span?.end({
      statusMessage: "Research completed successfully!",
    });

    return {
      referenceInformation: response.structuredResponse.referenceInformation,
    };
  };
};

export const buildGenerateSuggestionsNode = (
  modelProvider: LangChainModelProvider
) => {
  return async (
    state: ISuggestionWorkflowStateAnnotation["State"],
    runnableConfig: SuggestionWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig.configurable ?? {};
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
        referenceInformation: state.referenceInformation,
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

      const generation = span?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        environment: process.env.APP_ENVIRONMENT,
        input: sendMessagesInTelemetry ? prompt : undefined,
      });

      // LLM Call
      const model = modelProvider.getChatModel();
      const response = await model.invoke(prompt);

      generation?.end({
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens,
        },
        output: sendMessagesInTelemetry ? response : undefined,
      });

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
