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
        thinking_log: ["Skipping research phase - no tools available"],
        actions_taken: ["Skipped research phase"]
      };
    }

    const initialThoughts = [
      "Analyzing application requirements...",
      "Preparing to gather research information...",
      "Setting up research tools..."
    ];
    const initialActions = ["Initialized research phase"];

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
      thinking_log: [
        ...initialThoughts,
        "Processing research results...",
        "Compiling reference information..."
      ],
      actions_taken: [
        ...initialActions,
        "Executed research queries",
        "Generated reference information"
      ]
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
          thinking_log: [`Skipping ${type} requirement generation - disabled by user preferences`],
          actions_taken: [`Skipped ${type} requirement generation`]
        };
      }

      // Log requirement generation thoughts
      const genThoughts = [
        `Analyzing ${type} requirements generation context...`,
        `Preparing to generate ${type} requirements...`,
        `Processing reference information for ${type}...`
      ];
      const genActions = [`Initialized ${type} requirement generation`];

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
        thinking_log: [
          ...genThoughts,
          `Finalizing ${type} requirements...`,
          `Validating generated ${type} requirements...`
        ],
        actions_taken: [
          ...genActions,
          `Generated ${type} requirements`,
          `Validated ${type} requirements`
        ]
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
        thinking_log: [
          `Error encountered during ${type} requirement generation`,
          `Handling error gracefully...`
        ],
        actions_taken: [
          `Failed to generate ${type} requirements`,
          `Handled error gracefully`
        ]
      };
    }
  };
};
