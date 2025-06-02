export interface WorkflowProgressEvent {
  node: string;
  type: 'thinking' | 'action' | 'mcp';
  message: WorkflowProgressEventData;
  timestamp: number;
  correlationId?: string;
}

export interface WorkflowProgressEventData {
  title: string;
  input?: string;
  output?: string | object;
}

export enum WorkflowType {
  Solution = 'solution',
  Story = 'story',
  Task = 'task',
}
