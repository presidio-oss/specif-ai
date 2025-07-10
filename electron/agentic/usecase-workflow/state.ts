import { Annotation } from "@langchain/langgraph";

export const UseCaseWorkflowStateAnnotation = Annotation.Root({
  // Input data
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
  }>(),
  
  // Workflow state
  referenceInformation: Annotation<string>(),
  
  // Output data
  useCaseDraft: Annotation<{
    title: string;
    requirement: string;
  }>(),
});

export type IUseCaseWorkflowStateAnnotation = typeof UseCaseWorkflowStateAnnotation;
