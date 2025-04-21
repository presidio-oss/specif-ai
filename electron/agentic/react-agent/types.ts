import { z } from "zod";
import { LangfuseObservationClient } from "../../types/o11y";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export type IResponseFormatInput<
  TStructuredResponse extends Record<string, any> = Record<string, any>
> =
  | {
      prompt: string;
      schema: z.ZodType<TStructuredResponse>;
    }
  | z.ZodType<TStructuredResponse>;

export interface ReactAgentConfig extends LangGraphRunnableConfig {
  configurable?: {
    thread_id?: string;
    trace?: LangfuseObservationClient;
  };
}
