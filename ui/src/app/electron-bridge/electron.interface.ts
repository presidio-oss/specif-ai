import { IpcRendererEvent } from 'electron';
import {
  suggestionPayload,
  conversePayload,
  ChatUpdateRequirementResponse,
} from 'src/app/model/interfaces/chat.interface';
import {
  ICreateSolutionRequest,
  ISolutionResponse,
} from 'src/app/model/interfaces/projects.interface';
import {
  IUpdateRequirementRequest,
  IAddRequirementRequest,
} from 'src/app/model/interfaces/IRequirement';
import {
  IEditTaskResponse,
  IAddTaskResponse,
  ITaskRequest,
  ITasksResponse,
  IAddTaskRequest,
} from 'src/app/model/interfaces/ITask';
import {
  IFlowChartRequest,
  IFlowchartResponse,
  IAddBusinessProcessRequest,
  IAddBusinessProcessResponse,
  IUpdateProcessRequest,
  IUpdateProcessResponse,
} from 'src/app/model/interfaces/IBusinessProcess';
import {
  IUpdateUserStoryRequest,
  IUserStoriesRequest,
  IUserStoryResponse,
} from 'src/app/model/interfaces/IUserStory';
import { WorkflowType } from '../model/interfaces/workflow-progress.interface';

export interface ElectronAPI {
  openFile: () => Promise<string[]>;
  saveFile: (fileContent: any, filePath: string) => Promise<void>;
  openDirectory: () => Promise<string[]>;
  getStoreValue: (key: string) => Promise<any>;
  setStoreValue: (key: string, value: any) => Promise<void>;
  getThemeConfiguration: () => Promise<any>;
  loadURL: (serverConfig: any) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
  on: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: any[]) => void,
  ) => void;
  once: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: any[]) => void,
  ) => void;
  removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  getStyleUrl: () => string;
  reloadApp: () => void;
  openExternalUrl: (url: string) => Promise<boolean>;
  getSuggestions(payload: suggestionPayload): Promise<void>;
  getAppConfig(): Promise<{ key: string; host: string }>;
  verifyLLMConfig(
    provider: string,
    config: Record<string, any>,
  ): Promise<{
    status: 'success' | 'failed';
    message: string;
    provider: string;
    model: string;
    testResponse?: string;
  }>;
  createSolution(data: ICreateSolutionRequest): Promise<ISolutionResponse>;
  validateBedrock(config: {
    kbId: string;
    accessKeyId: string;
    secretKey: string;
    region: string;
    sessionKey?: string;
  }): Promise<boolean>;
  updateRequirement(
    request: IUpdateRequirementRequest,
  ): Promise<IEditTaskResponse>;
  addRequirement(request: IAddRequirementRequest): Promise<IAddTaskResponse>;
  chatUpdateRequirement(
    request: conversePayload,
  ): Promise<ChatUpdateRequirementResponse>;
  createFlowchart(request: IFlowChartRequest): Promise<IFlowchartResponse>;
  addBusinessProcess(
    request: IAddBusinessProcessRequest,
  ): Promise<IAddBusinessProcessResponse>;
  updateBusinessProcess(
    request: IUpdateProcessRequest,
  ): Promise<IUpdateProcessResponse>;
  createStories(request: IUserStoriesRequest): Promise<IUserStoryResponse>;
  updateStory(request: IUpdateUserStoryRequest): Promise<IUserStoryResponse>;
  addUserStory(request: IUpdateUserStoryRequest): Promise<IUserStoryResponse>;
  chatUserStoryTask(request: conversePayload): Promise<ChatUpdateRequirementResponse>;
  createTask(request: ITaskRequest): Promise<ITasksResponse>;
  addTask(request: IAddTaskRequest): Promise<ITasksResponse>;
  updateTask(request: IAddTaskRequest): Promise<ITasksResponse>;
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => void;
  removeFullscreenListener: () => void;
  getFullscreenState: () => Promise<boolean>;
  getPlatform: () => string;

  // Content Generation Process Management
  setContentGenerationStatus(
    solutionId: string,
    type: WorkflowType,
    isInProgress: boolean,
  ): Promise<void>;
  getContentGenerationStatus(type: WorkflowType): Promise<boolean>;
  getActiveContentGenerationProcesses(): Promise<any[]>;
  isAnyContentGenerationInProgress(): Promise<boolean>;
  getActiveContentGenerationProcessNames(): Promise<string[]>;
  clearAllContentGenerationProcesses(): Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
