import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const InlineEditWorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  selectedText: Annotation<string>({
    reducer: (_, val) => val,
  }),
  userPrompt: Annotation<string>({
    reducer: (_, val) => val,
  }),
  context: Annotation<string>({
    reducer: (_, val) => val,
  }),
  editedText: Annotation<string>({
    reducer: (_, val) => val,
    default: () => "",
  }),
  preserveFormatting: Annotation<boolean>({
    reducer: (_, val) => val,
    default: () => false,
  }),
  isComplete: Annotation<boolean>({
    reducer: (_, val) => val,
    default: () => false,
  }),
});

export type IInlineEditWorkflowStateAnnotation =
  typeof InlineEditWorkflowStateAnnotation;
