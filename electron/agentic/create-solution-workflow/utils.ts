import { createBRDPrompt } from "../../prompts/solution/create-brd";
import { createNFRPrompt } from "../../prompts/solution/create-nfr";
import { createPRDPrompt } from "../../prompts/solution/create-prd";
import { createUIRPrompt } from "../../prompts/solution/create-uir";
import { IGeneratedRequirementItem } from "../common/schemas";
import { IRequirementType } from "../common/types";

export type BaseRequirementGenerationContext = {
  app: {
    name: string;
    description: string;
  };
  maxCount: number;
  referenceInformation?: string;
};

export type PRDRequirementGenerationContext =
  BaseRequirementGenerationContext & {
    brds: Array<IGeneratedRequirementItem>;
  };

export type BuildPromptForRequirementParams =
  | {
      type: Exclude<IRequirementType, "PRD">;
      generationContext: BaseRequirementGenerationContext;
    }
  | {
      type: "PRD";
      generationContext: PRDRequirementGenerationContext;
    };

export const buildPromptForRequirement = (
  params: BuildPromptForRequirementParams
): string => {
  const { type, generationContext } = params;
  const {
    app: { name, description },
    maxCount,
    referenceInformation,
  } = generationContext;

  switch (type) {
    case "BRD":
      return createBRDPrompt({
        name,
        description,
        maxCount,
        referenceInformation,
      });
    case "NFR":
      return createNFRPrompt({
        name,
        description,
        maxCount,
        referenceInformation,
      });
    case "UIR":
      return createUIRPrompt({
        name,
        description,
        maxCount,
        referenceInformation,
      });
    case "PRD":
      return createPRDPrompt({
        name,
        description,
        maxCount,
        brds: generationContext.brds,
        referenceInformation,
      });
  }
};
