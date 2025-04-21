import { BaseMessage } from "@langchain/core/messages";
import {
  Annotation,
  Messages,
  messagesStateReducer,
} from "@langchain/langgraph";

export const createReactAgentAnnotation = <
  T extends Record<string, any> = Record<string, any>
>() =>
  Annotation.Root({
    messages: Annotation<BaseMessage[], Messages>({
      reducer: messagesStateReducer,
      default: () => [],
    }),
    conversationSummary: Annotation<string>({
      reducer: (_, action) => action,
      default: () => "",
    }),
    structuredResponse: Annotation<T>,
  });
