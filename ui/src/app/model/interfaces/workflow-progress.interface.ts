export interface WorkflowProgressEvent {
  node: string;
  type: 'thinking' | 'action' | 'mcp';
  message: string;
  timestamp: number;
  correlationId?: string;
}
export enum WorkflowType {
  Solution = 'solution',
  Story = 'story',
  Task = 'task',
}
