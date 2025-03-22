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
} from 'src/app/model/interfaces/ITask';
import {
  IFlowChartRequest,
  IFlowchartResponse,
  IAddBusinessProcessRequest,
  IAddBusinessProcessResponse,
  IUpdateProcessRequest,
  IUpdateProcessResponse,
} from 'src/app/model/interfaces/IBusinessProcess';

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
