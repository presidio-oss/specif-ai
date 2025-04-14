import { Annotation } from "@langchain/langgraph";
import { IGeneratedRequirementItem } from "../common/schemas";
import { IRequirementItemGenerationPref } from "../common/types";

export type IGenerationRequirementsState = {
  feedback?: string;
  requirements: Array<IGeneratedRequirementItem>;
};

export const CreateSolutionStateAnnotation = Annotation.Root({
  generatedRequirements: Annotation<{
    PRD: IGenerationRequirementsState;
    BRD: IGenerationRequirementsState;
    UIR: IGenerationRequirementsState;
    NFR: IGenerationRequirementsState;
  }>({
    reducer: (prev, curr) => {
      return {
        ...prev,
        ...curr,
      };
    },
  }),
  referenceInformation: Annotation<string>,
  // generation details
  app: Annotation<{
    name: string;
    description: string;
  }>,
  requirementGenerationPreferences:
    Annotation<Record<string, IRequirementItemGenerationPref>>(),
});

export type ICreateSolutionWorkflowStateAnnotation =
  typeof CreateSolutionStateAnnotation;
