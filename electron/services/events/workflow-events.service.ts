import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export enum WorkflowEventType {
  Thinking = "thinking",
  Action = "action",
  Mcp = "mcp",
  Error = "error",
}

export interface WorkflowProgressEvent {
  node: string;
  type: WorkflowEventType;
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

  public createEvent(
    node: string,
    type: WorkflowEventType,
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
    const event = this.createEvent(
      node,
      WorkflowEventType.Thinking,
      message,
      correlationId
    );
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchAction(
    node: string,
    message: WorkflowProgressEventData,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(
      node,
      WorkflowEventType.Action,
      message,
      correlationId
    );
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchMcp(
    node: string,
    message: WorkflowProgressEventData,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(
      node,
      WorkflowEventType.Mcp,
      message,
      correlationId
    );
    await dispatchCustomEvent(this.eventName, event, config);
  }

  async dispatchError(
    node: string,
    message: WorkflowProgressEventData,
    config: LangGraphRunnableConfig,
    correlationId?: string
  ): Promise<void> {
    const event = this.createEvent(
      node,
      WorkflowEventType.Error,
      message,
      correlationId
    );
    await dispatchCustomEvent(this.eventName, event, config);
  }
}
