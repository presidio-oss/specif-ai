import { Annotation } from "@langchain/langgraph";

export const StrategicInitiativeWorkflowStateAnnotation = Annotation.Root({
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
  
  strategicInitiativeDraft: Annotation<{
    title: string;
    requirement: string;
  }>(),
});

export type IStrategicInitiativeWorkflowStateAnnotation = typeof StrategicInitiativeWorkflowStateAnnotation;
