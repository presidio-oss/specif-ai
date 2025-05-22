import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export interface WorkflowProgressEvent {
  node: string;
  type: "thinking" | "action" | "mcp";
  message: string;
  timestamp: number;
}

export class WorkflowEventsService {
  private readonly eventName: string;

  constructor(workflowName: string) {
    this.eventName = `${workflowName}-workflow-progress`;
  }

  private createEvent(
    node: string,
    type: WorkflowProgressEvent["type"],
    message: string
  ): WorkflowProgressEvent {
    return {
      node,
      type,
      message,
      timestamp: Date.now()
    };
  }

  async dispatchThinking(
    node: string,
    message: string,
    config: LangGraphRunnableConfig
  ): Promise<void> {
    const event = this.createEvent(node, "thinking", message);
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchAction(
    node: string,
    message: string,
    config: LangGraphRunnableConfig
  ): Promise<void> {
    const event = this.createEvent(node, "action", message);
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchMcp(
    node: string,
    message: string,
    config: LangGraphRunnableConfig
  ): Promise<void> {
    const event = this.createEvent(node, "mcp", message);
    await dispatchCustomEvent(this.eventName, event, config);
  }
}
