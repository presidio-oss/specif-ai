import { HumanMessage } from "@langchain/core/messages";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildReactAgent } from "../react-agent";
import { refinePrompt } from "../../prompts/feature/evaluation/refine";
import { evaluatePrompt } from "../../prompts/feature/evaluation/evaluate";
import { repairJSON } from "../../utils/custom-json-parser";
import { IUserStoryWorkflowStateAnnotation } from "./state";
import { UserStoryWorkflowRunnableConfig } from "./types";
import { createUserStoryResearchInformationPrompt } from "./prompts/research-information";
import { createSummarizeUserStoryResearchPrompt } from "./prompts/summarize-research";

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
    state: IUserStoryWorkflowStateAnnotation["State"],
    runnableConfig: UserStoryWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig?.configurable ?? {};
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
        prompt: createSummarizeUserStoryResearchPrompt({
          appName: state.appName,
          appDescription: state.appDescription,
          reqName: state.reqName,
          reqDesc: state.reqDesc,
          technicalDetails: state.technicalDetails,
          extraContext: state.extraContext,
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
          createUserStoryResearchInformationPrompt({
            appName: state.appName,
            appDescription: state.appDescription,
            reqName: state.reqName,
            reqDesc: state.reqDesc,
            technicalDetails: state.technicalDetails,
            extraContext: state.extraContext,
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

// Generate Initial Stories Node
export const buildGenerateStoriesNode = (
  modelProvider: LangChainModelProvider
) => {
  return async (
    state: IUserStoryWorkflowStateAnnotation["State"],
    runnableConfig: UserStoryWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig?.configurable ?? {};

    const span = trace?.span({
      name: "generate-stories",
    });

    try {
      // Use existing refinePrompt logic
      const prompt = refinePrompt({
        reqName: state.reqName,
        reqDesc: state.reqDesc,
        extraContext: state.extraContext,
        referenceInformation: state.referenceInformation,
        technologies: state.technicalDetails,
        features:
          state.stories.length > 0
            ? JSON.stringify({ features: state.stories })
            : undefined,
        evaluation: state.evaluation,
      });

      const generation = span?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        environment: process.env.APP_ENVIRONMENT,
        input: sendMessagesInTelemetry
          ? state.messages.length > 0
            ? state.messages
            : [new HumanMessage(prompt)]
          : undefined,
      });

      // LLM Call
      const model = modelProvider.getChatModel();
      const response = await model.invoke(prompt);
      console.log(response);

      generation?.end({
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens,
        },
        output: sendMessagesInTelemetry ? response : undefined,
      });

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
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig.configurable ?? {};
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
        reqName: state.reqName,
        reqDesc: state.reqDesc,
        features: JSON.stringify(state.stories),
      });

      const generation = span?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        input: sendMessagesInTelemetry
          ? state.messages.length > 0
            ? state.messages
            : [new HumanMessage(prompt)]
          : undefined,
      });

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
