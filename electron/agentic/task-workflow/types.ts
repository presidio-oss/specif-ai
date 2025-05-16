import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { LangfuseObservationClient } from "../../types/o11y";

export interface TaskWorkflowRunnableConfig extends LangGraphRunnableConfig {
  configurable?: {
    trace?: LangfuseObservationClient;
    thread_id?: string;
    sendMessagesInTelemetry?: boolean;
  };
}
