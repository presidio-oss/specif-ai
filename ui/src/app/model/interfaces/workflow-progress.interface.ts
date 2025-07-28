import { IpcRendererEvent } from 'electron';

export enum WorkflowProgressEventType {
  Thinking = 'thinking',
  Action = 'action',
  Mcp = 'mcp',
  Error = 'error',
}

export interface WorkflowProgressEvent {
  node: string;
  type: WorkflowProgressEventType;
  message: WorkflowProgressEventData;
  timestamp: number;
  correlationId?: string;
}

export interface WorkflowProgressEventData {
  title: string;
  input?: string;
  output?: string | object;
}

export interface WorkflowErrorEvent {
  timestamp: string;
  reason?: string;
}

export interface WorkflowStatus {
  isCreating: boolean;
  isComplete: boolean;
  isFailed?: boolean;
  failureInfo?: WorkflowErrorEvent;
}

export interface WorkflowProgressState {
  [projectId: string]: {
    [workflowType: string]: WorkflowProgressEvent[];
  };
}

export interface WorkflowStatusState {
  [projectId: string]: {
    [workflowType: string]: WorkflowStatus;
  };
}

export interface ActiveListener {
  readonly projectId: string;
  readonly workflowType: WorkflowType;
  readonly registeredListener: (
    event: IpcRendererEvent,
    ...args: any[]
  ) => void;
}

export const WORKFLOW_PROGRESS_CONFIG = {
  MAX_EVENTS_PER_WORKFLOW: 1000,
  LISTENER_KEY_SEPARATOR: '-',
  DEFAULT_TIMEOUT: 5000,
} as const;

export class WorkflowProgressError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'WorkflowProgressError';
  }
}

export enum WorkflowType {
  Solution = 'solution',
  Story = 'story',
  Task = 'task',
  TestCase = 'test-case',
  StrategicInitiative = 'strategic-initiative',
}
