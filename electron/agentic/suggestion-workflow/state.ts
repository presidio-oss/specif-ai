import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BedrockConfig } from "../../schema/helper/bedrock.options.schema";
import { BrdSchema } from "../../schema/core/get-suggestions.schema";

export const SuggestionWorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  suggestions: Annotation<string[]>({
    reducer: (_, val) => val,
    default: () => [],
  }),
  selectedSuggestion: Annotation<string>({
    reducer: (_, val) => val,
  }),
  name: Annotation<string>({
    reducer: (_, val) => val,
  }),
  description: Annotation<string>({
    reducer: (_, val) => val,
  }),
  type: Annotation<string>({
    reducer: (_, val) => val,
  }),
  requirement: Annotation<string>({
    reducer: (_, val) => val,
  }),
  requirementAbbr: Annotation<string>({
    reducer: (_, val) => val,
  }),
  knowledgeBase: Annotation<string>({
    reducer: (_, val) => val,
  }),
  bedrockConfig: Annotation<BedrockConfig>({
    reducer: (_, val) => val,
  }),
  brds: Annotation<BrdSchema[]>({
    reducer: (_, val) => val,
    default: () => [],
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

export type ISuggestionWorkflowStateAnnotation =
  typeof SuggestionWorkflowStateAnnotation;
