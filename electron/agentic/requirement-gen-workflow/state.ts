import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { IGeneratedRequirementItem } from "../common/schemas";
import { IRequirementType } from "../common/types";

export const RequirementGenWorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  requirements: Annotation<Array<IGeneratedRequirementItem>>({
    reducer: (_, val) => val,
  }),
  type: Annotation<IRequirementType>({
    reducer: (_, val) => val,
  }),
  feedbackOnRequirements: Annotation<string>({
    reducer: (_, val) => val,
  }),
  feedbackLoops: Annotation<number>({
    reducer: (_, val) => val,
    default: () => 0,
  }),
});

export type IRequirementGenWorkflowStateAnnotation =
  typeof RequirementGenWorkflowStateAnnotation;
