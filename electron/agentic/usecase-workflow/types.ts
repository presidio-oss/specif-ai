import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { LangfuseObservationClient } from "../../types/o11y";

export interface StrategicInitiativeWorkflowRunnableConfig extends LangGraphRunnableConfig {
  configurable?: {
    thread_id?: string;
    trace?: LangfuseObservationClient;
    sendMessagesInTelemetry?: boolean;
  };
}
