import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const TaskWorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  tasks: Annotation<Array<any>>({
    reducer: (_, val) => val,
    default: () => [],
  }),
  name: Annotation<string>({
    reducer: (_, val) => val,
  }),
  userStory: Annotation<string>({
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

export type ITaskWorkflowStateAnnotation = typeof TaskWorkflowStateAnnotation;
