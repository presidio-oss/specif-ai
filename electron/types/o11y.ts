import { LangfuseTraceClient, LangfuseSpanClient } from "langfuse";

export type LangfuseObservationClient = LangfuseTraceClient | LangfuseSpanClient;
