import { HumanMessage } from "@langchain/core/messages";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import { REQUIREMENT_TYPE } from "../../constants/requirement.constants";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { IRequirementType, ITool } from "../common/types";
import { buildReactAgent } from "../react-agent";
import { createRequirementGenWorkflow } from "../requirement-gen-workflow";
import { IRequirementGenWorkflowStateAnnotation } from "../requirement-gen-workflow/state";
import { createResearchInformationPrompt } from "./prompts/research-information";
import { createSummarizeResearchPrompt } from "./prompts/summarize-research";
import {
  ICreateSolutionWorkflowStateAnnotation,
  IGenerationRequirementsState,
} from "./state";
import { CreateSolutionWorkflowRunnableConfig } from "./types";
import { buildPromptForRequirement } from "./utils";

// nodes

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
    state: ICreateSolutionWorkflowStateAnnotation["State"],
    runnableConfig: CreateSolutionWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } = runnableConfig.configurable ?? {};
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
        prompt: createSummarizeResearchPrompt({
          app: state.app,
          requirementPreferences: state.requirementGenerationPreferences,
        }),
        schema: z.object({
          referenceInformation: z.string(),
        }),
      },
      checkpointer: checkpointer,
    });

    // TODO: Discuss
    // max(min(64, each tool called twice (for each tool call - llm node + tool node + trim messaegs node) so 3) + 1 (for structured output)), 128)
    const recursionLimit = Math.min(Math.max(64, tools.length * 2 * 3 + 1), 128);

    const response = await agent.invoke(
      {
        messages: [
          createResearchInformationPrompt({
            app: state.app,
            recursionLimit: recursionLimit,
            requirementPreferences: state.requirementGenerationPreferences,
          }),
        ],
      },
      {
        recursionLimit: recursionLimit,
        configurable: {
          trace: span,
          thread_id: runnableConfig.configurable?.thread_id,
          sendMessagesInTelemetry: sendMessagesInTelemetry
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

type BuildGenerationNodeParams = {
  type: IRequirementType;
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const buildReqGenerationNode = (params: BuildGenerationNodeParams) => {
  const { type, model, checkpointer } = params;

  return async (
    state: ICreateSolutionWorkflowStateAnnotation["State"],
    runnableConfig: CreateSolutionWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } = runnableConfig.configurable ?? {};
    const span = trace?.span({
      name: `generate-${type.toLowerCase()}`,
    });

    try {
      const preferences = state.requirementGenerationPreferences[type];

      if (!preferences.isEnabled) {
        const message = `User opted not to generate ${type} requirement`;
        span?.end({
          statusMessage: message,
        });
        return {
          generatedRequirements: {
            [type]: {
              requirements: [],
              feedback: message,
            } as IGenerationRequirementsState,
          },
        };
      }

      const subgraph = createRequirementGenWorkflow({
        model: model,
        checkpointer: checkpointer,
      });

      const requirementTypePrompt = buildPromptForRequirement({
        type,
        generationContext: {
          app: state.app,
          referenceInformation: state.referenceInformation,
          ...preferences,
          ...(type === REQUIREMENT_TYPE.PRD
            ? { brds: state.generatedRequirements.BRD.requirements }
            : {}),
        } as any,
      });

      const initialState: Partial<
        IRequirementGenWorkflowStateAnnotation["State"]
      > = {
        messages: [new HumanMessage(requirementTypePrompt)],
        requirements: [],
        type: type,
      };

      const response = await subgraph.invoke(initialState, {
        configurable: {
          trace: span,
          thread_id: runnableConfig.configurable?.thread_id,
          sendMessagesInTelemetry: sendMessagesInTelemetry
        },
      });

      span?.end({
        statusMessage: "Successfully generated requirements",
      });

      return {
        generatedRequirements: {
          [type]: {
            requirements: response.requirements,
            feedback: response.feedbackOnRequirements,
          } as IGenerationRequirementsState,
        },
      };
    } catch (error) {
      const message = `[create-solution] Error in generate-${type.toLowerCase()} node: ${error}`;
      console.error(message, error);
      span?.end({
        level: "ERROR",
      });
      // handle gracefully for now
      return {
        generatedRequirements: {
          [type]: {
            requirements: [],
            feedback: message,
          } as IGenerationRequirementsState,
        },
      };
    }
  };
};
