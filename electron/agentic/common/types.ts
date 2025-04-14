import { RunnableToolLike } from "@langchain/core/runnables";
import { DynamicTool, StructuredToolInterface } from "@langchain/core/tools";

export type IRequirementType = "PRD" | "BRD" | "UIR" | "NFR";

export type ITool = (StructuredToolInterface | DynamicTool | RunnableToolLike);

export type IRequirementItemGenerationPref = {
    isEnabled: boolean;
    max_count: number;
    additionalContext?: string;
}