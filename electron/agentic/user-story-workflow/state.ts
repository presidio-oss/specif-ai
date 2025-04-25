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
  requirements: Annotation<string>({
    reducer: (_, val) => val,
  }),
  technicalDetails: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  extraContext: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
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

export type IUserStoryWorkflowStateAnnotation = typeof UserStoryWorkflowStateAnnotation;
