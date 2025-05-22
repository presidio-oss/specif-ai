import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { LangfuseObservationClient } from "../../types/o11y";

export interface WorkflowProgressEvent {
  node: string;
  type: "thinking" | "action" | "mcp";
  message: string;
  timestamp: number;
}

export interface CreateSolutionWorkflowRunnableConfig extends LangGraphRunnableConfig {
  configurable?: {
    thread_id?: string;
    trace?: LangfuseObservationClient;
    sendMessagesInTelemetry?: boolean;
  };
}
