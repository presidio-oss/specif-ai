import { HumanMessage } from "@langchain/core/messages";
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
import { buildPromptForRequirement } from "./utils";

// nodes

type BuildResearchNodeParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
};

export const buildResearchNode = ({
  model,
  tools,
}: BuildResearchNodeParams) => {
  return async (state: ICreateSolutionWorkflowStateAnnotation["State"]) => {
    if (tools.length === 0) {
      console.log("No tools are passed so skipping research phase");
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
          requirementPreferences: state.requirementGenerationPreferences
        }),
        schema: z.object({
          referenceInformation: z.string(),
        }),
      },
    });

    // TODO: Discuss
    const recursionLimit = 64;

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
      }
    );

    return {
      referenceInformation: response.structuredResponse.referenceInformation,
    };
  };
};

type BuildGenerationNodeParams = {
  type: IRequirementType;
  model: LangChainModelProvider;
};

export const buildReqGenerationNode = (params: BuildGenerationNodeParams) => {
  const { type, model } = params;

  return async (state: ICreateSolutionWorkflowStateAnnotation["State"]) => {
    const preferences = state.requirementGenerationPreferences[type];

    if (!preferences.isEnabled) {
      return {
        generatedRequirements: {
          [type]: {
            requirements: [],
            feedback: "User opted not to generated this requirement",
          } as IGenerationRequirementsState,
        },
      };
    }

    const subgraph = createRequirementGenWorkflow({
      model: model,
    });

    const requirementTypePrompt = buildPromptForRequirement({
      type,
      generationContext: {
        app: state.app,
        ...preferences,
        ...(type === REQUIREMENT_TYPE.PRD
          ? { brds: state.generatedRequirements.BRD.requirements }
          : {}),
      } as any,
    });

    const initialState: Partial<IRequirementGenWorkflowStateAnnotation["State"]> = {
      messages: [new HumanMessage(requirementTypePrompt)],
      requirements: [],
      type: type,
    };

    const response = await subgraph.invoke(initialState);

    return {
      generatedRequirements: {
        [type]: {
          requirements: response.requirements,
          feedback: response.feedbackOnRequirements,
        } as IGenerationRequirementsState,
      },
    };
  };
};
