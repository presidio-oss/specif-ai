import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export interface WorkflowProgressEvent {
  node: string;
  type: "thinking" | "action" | "mcp";
  message: WorkflowProgressEventData;
  timestamp: number;
  correlationId?: string;
}
export interface WorkflowProgressEventData {
  title: string;
  input?: string;
  output?: string | object;
}

export class WorkflowEventsService {
  private readonly eventName: string;

  constructor(workflowName: string) {
    this.eventName = `${workflowName}-workflow-progress`;
  }

  private createEvent(
    node: string,
    type: WorkflowProgressEvent["type"],
    message: WorkflowProgressEventData,
    correlationId?: string
  ): WorkflowProgressEvent {
    return {
      node,
      type,
      message,
      timestamp: Date.now(),
      ...(correlationId && { correlationId }),
    };
  }

  async dispatchThinking(
    node: string,
    message: WorkflowProgressEventData,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(node, "thinking", message, correlationId);
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchAction(
    node: string,
    message: WorkflowProgressEventData,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(node, "action", message, correlationId);
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchMcp(
    node: string,
    message: WorkflowProgressEventData,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(node, "mcp", message, correlationId);
    await dispatchCustomEvent(this.eventName, event, config);
  }
}
