export interface WorkflowProgressEvent {
  node: string;
  type: "thinking" | "action" | "mcp";
  message: string;
  timestamp: number;
}
