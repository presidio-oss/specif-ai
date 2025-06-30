import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { TestCase } from "./types";

export const TestCaseWorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  userStoryId: Annotation<string>({
    reducer: (_, val) => val,
  }),
  userStoryTitle: Annotation<string>({
    reducer: (_, val) => val,
  }),
  userStoryDescription: Annotation<string>({
    reducer: (_, val) => val,
  }),
  prdId: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  prdTitle: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  prdDescription: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  acceptanceCriteria: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  technicalDetails: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  extraContext: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  userScreensInvolved: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  referenceInformation: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  testCases: Annotation<TestCase[]>({
    reducer: (_, val) => val,
    default: () => [],
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

export type ITestCaseWorkflowStateAnnotation = typeof TestCaseWorkflowStateAnnotation;
