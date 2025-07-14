import { Annotation } from "@langchain/langgraph";

export const UseCaseWorkflowStateAnnotation = Annotation.Root({
  project: Annotation<{
    name: string;
    description: string;
    solution: {
      name: string;
      description: string;
      techDetails: string;
    }
  }>(),
  requirement: Annotation<{
    title?: string;
    description?: string;
    researchUrls?: string[];
  }>(),
  
  referenceInformation: Annotation<string>(),
  
  useCaseDraft: Annotation<{
    title: string;
    requirement: string;
  }>(),
});

export type IUseCaseWorkflowStateAnnotation = typeof UseCaseWorkflowStateAnnotation;
