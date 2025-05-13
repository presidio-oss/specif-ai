import { RunnableToolLike } from "@langchain/core/runnables";
import { DynamicTool, StructuredToolInterface } from "@langchain/core/tools";
import { LangfuseTraceClient, LangfuseSpanClient } from "langfuse";

export type IRequirementType = "PRD" | "BRD" | "UIR" | "NFR";

export type ITool = StructuredToolInterface | DynamicTool | RunnableToolLike;

export type IRequirementItemGenerationPref = {
    isEnabled: boolean;
    minCount: number;
    additionalContext?: string;
}
