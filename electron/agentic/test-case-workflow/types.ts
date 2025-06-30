import { BaseMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { LangfuseTraceClient } from "langfuse";

export interface TestCase {
  id: string;
  title: string;
  description: string;
  preConditions: string[];
  postConditions?: string[];
  steps: {
    stepNumber: number;
    action: string;
    expectedResult: string;
  }[];
  priority: 'High' | 'Medium' | 'Low';
  type: 'Functional' | 'Integration' | 'UI/UX' | 'Performance' | 'Security';
}

export interface TestCaseWorkflowRunnableConfig extends RunnableConfig {
  configurable?: {
    thread_id?: string;
    trace?: LangfuseTraceClient;
    sendMessagesInTelemetry?: boolean;
  };
}
