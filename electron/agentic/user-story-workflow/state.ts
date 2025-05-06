import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const UserStoryWorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  stories: Annotation<Array<any>>({
    reducer: (_, val) => val,
    default: () => [],
  }),
  reqName: Annotation<string>({
    reducer: (_, val) => val,
  }),
  reqDesc: Annotation<string>({
    reducer: (_, val) => val,
  }),
  appName: Annotation<string>({
    reducer: (_, val) => val,
  }),
  appDescription: Annotation<string>({
    reducer: (_, val) => val,
  }),
  technicalDetails: Annotation<string>({
    reducer: (_, val) => val,
  }),
  extraContext: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  referenceInformation: Annotation<string>,
  evaluation: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  feedbackLoops: Annotation<number>({
    reducer: (_, val) => val,
    default: () => 0,
  }),
  isComplete: Annotation<boolean>({
    reducer: (_, val) => val,
    default: () => false,
  }),
});

export type IUserStoryWorkflowStateAnnotation =
  typeof UserStoryWorkflowStateAnnotation;
