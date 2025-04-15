import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { LangfuseObservationClient } from "../../types/o11y";

export interface CreateSolutionWorkflowRunnableConfig extends LangGraphRunnableConfig {
  configurable?: {
    thread_id?: string;
    trace?: LangfuseObservationClient;
  };
}
