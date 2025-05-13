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
  description: Annotation<string>({
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

export type ITaskWorkflowStateAnnotation = typeof TaskWorkflowStateAnnotation;
