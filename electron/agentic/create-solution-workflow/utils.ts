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
  minCount: number;
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
    minCount,
    referenceInformation,
  } = generationContext;

  switch (type) {
    case "BRD":
      return createBRDPrompt({
        name,
        description,
        minCount,
        referenceInformation,
      });
    case "NFR":
      return createNFRPrompt({
        name,
        description,
        minCount,
        referenceInformation,
      });
    case "UIR":
      return createUIRPrompt({
        name,
        description,
        minCount,
        referenceInformation,
      });
    case "PRD":
      return createPRDPrompt({
        name,
        description,
        minCount,
        brds: generationContext.brds,
        referenceInformation,
      });
  }
};
