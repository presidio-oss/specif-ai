import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export interface WorkflowProgressEvent {
  node: string;
  type: "thinking" | "action" | "mcp";
  message: string;
  timestamp: number;
  correlationId?: string;
}

export class WorkflowEventsService {
  private readonly eventName: string;

  constructor(workflowName: string) {
    this.eventName = `${workflowName}-workflow-progress`;
  }

  private createEvent(
    node: string,
    type: WorkflowProgressEvent["type"],
    message: string,
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
    message: string,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(node, "thinking", message, correlationId);
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchAction(
    node: string,
    message: string,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(node, "action", message, correlationId);
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchMcp(
    node: string,
    message: string,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(node, "mcp", message, correlationId);
    await dispatchCustomEvent(this.eventName, event, config);
  }
}
