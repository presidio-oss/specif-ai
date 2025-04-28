import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { IpcRendererEvent } from 'electron';
import { ToasterService } from '../services/toaster/toaster.service';
import { Router } from '@angular/router';
import { DialogService } from '../services/dialog/dialog.service';
import { IpcInterceptor } from '../interceptor/ipc.interceptor';
import { PortErrorDialogComponent } from 'src/app/components/port-error-dialog/port-error-dialog.component';
import { BedrockValidationPayload, suggestionPayload } from 'src/app/model/interfaces/chat.interface';
import {
  DocumentMetadata,
  ICreateSolutionRequest,
  IProject,
  ISolutionResponse,
} from 'src/app/model/interfaces/projects.interface';
import { ElectronAPI } from './electron.interface';
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
  IAddBusinessProcessRequest,
  IUpdateProcessResponse,
  IAddBusinessProcessResponse,
  IUpdateProcessRequest,
} from 'src/app/model/interfaces/IBusinessProcess';
import {
  conversePayload,
  ChatUpdateRequirementResponse,
} from 'src/app/model/interfaces/chat.interface';
import {
  IFlowChartRequest,
  IFlowchartResponse,
} from '../model/interfaces/IBusinessProcess';
import {
  IUpdateUserStoryRequest,
  IUserStoriesRequest,
  IUserStoryResponse,
} from '../model/interfaces/IUserStory';
import { AutoUpdateModalComponent } from '../components/auto-update-modal/auto-update-modal.component';
import { htmlToMarkdown } from '../utils/html.utils';
import { DOCUMENT_CHANNELS, SOLUTION_CHANNELS } from './channels.constants';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  
  electronAPI: ElectronAPI | undefined;
  constructor(
    private logger: NGXLogger,
    private toast: ToasterService,
    private router: Router,
    private dialogService: DialogService,
    private ipc: IpcInterceptor,
  ) {
    if (this.isElectron()) {
      this.electronAPI = window.electronAPI;
    }
  }

  async getSuggestions(payload: suggestionPayload) {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'core:getSuggestions',
        args: [payload],
        skipLoading: true
      });
    }
  }

  async getAppConfig() {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'core:getAppConfig',
        skipLoading: true,
      });
    }
  }

  async createSolution(
    data: ICreateSolutionRequest,
  ): Promise<ISolutionResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'solution:createSolution',
        args: [data],
      });
    }
    throw new Error('Electron is not available');
  }

  async validateBedrock(config: BedrockValidationPayload): Promise<boolean> {
    if (this.electronAPI) {
      const response = await this.ipc.request({
        channel: 'solution:validateBedrock',
        args: [config],
      });
      return response.isValid;
    }
    throw new Error('Electron is not available');
  }

  async chatUpdateRequirement(
    request: conversePayload,
  ): Promise<ChatUpdateRequirementResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'requirement:chat',
        args: [request],
        skipLoading: true
      });
    }
    throw new Error('Electron is not available');
  }

  async addRequirement(
    request: IAddRequirementRequest,
  ): Promise<IAddTaskResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'requirement:add',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async updateRequirement(
    request: IUpdateRequirementRequest,
  ): Promise<IEditTaskResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'requirement:update',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async addBusinessProcess(
    request: IAddBusinessProcessRequest,
  ): Promise<IAddBusinessProcessResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'requirement:bp-add',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async updateBusinessProcess(
    request: IUpdateProcessRequest,
  ): Promise<IUpdateProcessResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'requirement:bp-update',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async createFlowchart(
    request: IFlowChartRequest,
  ): Promise<IFlowchartResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'visualization:flowchart',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async createStories(
    request: IUserStoriesRequest,
  ): Promise<IUserStoryResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'story:create',
        args: [request],
        skipLoading: true
      });
    }
    throw new Error('Electron is not available');
  }

  async updateStory(
    request: IUpdateUserStoryRequest,
  ): Promise<IUserStoryResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'story:update',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async createTask(
    request: ITaskRequest,
  ): Promise<ITasksResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'task:create',
        args: [request],
        skipLoading: true
      });
    }
    throw new Error('Electron is not available');
  }

  async addTask(
    request: IAddTaskRequest,
  ): Promise<ITasksResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'task:add',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async updateTask(
    request: IAddTaskRequest,
  ): Promise<ITasksResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'task:update',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async addUserStory(
    request: IUpdateUserStoryRequest,
  ): Promise<IUserStoryResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'story:add',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async chatUserStoryTask(
    request: conversePayload,
  ): Promise<ChatUpdateRequirementResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'story:chat',
        args: [request],
        skipLoading: true
      });
    }
    throw new Error('Electron is not available');
  }

  async verifyLLMConfig(provider: string, config: Record<string, any>) {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'core:verifyLLMConfig',
        args: [
          {
            provider,
            config,
          },
        ],
      });
    }
  }

  async killPort(port: number): Promise<void> {
    if (this.electronAPI) {
      this.electronAPI.invoke('kill-port', port);
    }
  }

  isElectron(): boolean {
    return !!window.electronAPI;
  }

  async startJiraOAuth(oauthParams: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    expirationDate: string;
    tokenType: string;
    cloudId: string;
  }> {
    if (this.electronAPI) {
      return new Promise((resolve, reject) => {
        this.electronAPI?.send('start-jira-oauth', oauthParams);

        this.electronAPI?.once(
          'oauth-reply',
          (
            _: IpcRendererEvent,
            authResponse: {
              accessToken: string;
              refreshToken: string;
              expirationDate: string;
              tokenType: string;
              cloudId: string;
            },
          ) => {
            if (authResponse.accessToken) {
              resolve(authResponse);
            } else {
              reject('OAuth process failed. No token received.');
            }
          },
        );

        this.electronAPI?.once('port-error', (_: any, message: any) => {
          console.error('Port Error: ', message.message);
        });
      });
    } else {
      throw new Error('Electron is not available');
    }
  }

  async listenPort(): Promise<void> {
    if (this.electronAPI) {
      if (sessionStorage.getItem('serverActive') === 'true') {
        console.debug('Server is already running.');
      } else {
        this.electronAPI.send('start-server');

        this.electronAPI.on('port-error', (_: any, message: string) => {
          console.error('Port Error: ', message);
          this.dialogService
            .createBuilder()
            .forComponent(PortErrorDialogComponent)
            .disableClose()
            .open();
        });
        this.electronAPI.on('server-started', () => {
          sessionStorage.setItem('serverActive', 'true');
        });
      }
    }
  }

  async refreshJiraToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expirationDate: string;
    tokenType: string;
    cloudId: string;
  }> {
    if (this.electronAPI) {
      return new Promise((resolve, reject) => {
        this.electronAPI?.send('refresh-jira-token', { refreshToken });

        this.electronAPI?.once(
          'oauth-reply',
          (
            _: IpcRendererEvent,
            authResponse: {
              accessToken: string;
              refreshToken: string;
              expirationDate: string;
              tokenType: string;
              cloudId: string;
            },
          ) => {
            if (authResponse.accessToken) {
              resolve(authResponse);
            } else {
              reject('Token refresh process failed. No token received.');
            }
          },
        );
      });
    } else {
      throw new Error('Electron is not available');
    }
  }

  async openDirectory(): Promise<Array<string>> {
    if (this.electronAPI) {
      return await this.electronAPI.openDirectory();
    }
    return [];
  }

  async invokeFunction(functionName: string, params: any): Promise<any> {
    if (this.electronAPI) {
      this.logger.debug(params);
      return await this.ipc.request({
        channel: 'invokeCustomFunction',
        args: [{
          functionName,
          params: { ...params },
        }],
        skipWarning: true,
        skipLoading: true
      });
    }
  }

  async reloadApp() {
    if (this.electronAPI) {
      return await this.electronAPI.invoke('reloadApp', {});
    }
  }

  async getStoreValue(key: string): Promise<any> {
    if (this.electronAPI) {
      return await this.electronAPI.getStoreValue(key);
    }
    return null;
  }

  async setStoreValue(key: string, value: any): Promise<void> {
    if (this.electronAPI) {
      await this.electronAPI.setStoreValue(key, value);
    }
  }

  async removeStoreValue(key: string): Promise<void> {
    if (this.electronAPI) {
      await this.electronAPI.invoke('removeStoreValue', key);
    }
  }

  // App auto updater functions
  async checkForUpdates(force: boolean = false) {
    if (!this.electronAPI) {
      throw new Error('Electron is not available');
    }
    
    // Check whether auto update is turned on
    const { isAutoUpdate = true } = await this.electronAPI.getStoreValue('APP_CONFIG') || {};
    if (!force && !isAutoUpdate) {
      return;
    }

    // Check whether there are any newer update
    const response = await this.ipc.request({
      channel: 'app-updater:check-for-updates'
    });
    if (!response) {
      return;
    }

    // Trigger auto updater modal
    this.dialogService
    .createBuilder()
    .forComponent(AutoUpdateModalComponent)
    .withWidth('600px')
    .withData({
      version: response.version,
      currentVersion: response.currentVersion,
      releaseDate: response.releaseDate,
      releaseNotes: await htmlToMarkdown(response.releaseNotes ?? ''),
    })
    .disableClose()
    .open();
  }

  async downloadUpdates(version: string) {
    if (!this.electronAPI) {
      throw new Error('Electron is not available');
    }

    return this.ipc.request({
      channel: 'app-updater:download-updates',
      args: [{ version }]
    });
  }

  async setRootDirectory(): Promise<{ success: boolean; error?: string }> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'solution:setRootDir',
      });
    }
    throw new Error('Electron is not available');
  }

  async getSolutions(): Promise<IProject[]> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'solution:getSolutions',
      });
    }
    throw new Error('Electron is not available');
  }

  async activateSolution(solutionName: string): Promise<{ success: boolean }> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'solution:activate',
        args: [solutionName]
      });
    }
    throw new Error('Electron is not available');
  }

  async getSolutionByName(solutionName: string, docTypes?: string[]) {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'solution:getSolutionByName',
        args: [solutionName, docTypes]
      });
    }
    throw new Error('Electron is not available');
  }

  async getDocumentByCount(request: { solutionId: number }) {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: DOCUMENT_CHANNELS.GET_DOCUMENT_BY_COUNT,
        args: [request]
      });
    }
  }

  async getAllDocuments(request: { solutionId: number }) {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: DOCUMENT_CHANNELS.GET_ALL_DOCUMENTS,
        args: [request]
      });
    }
  }

  async getSolutionMetadata(request: { solutionId: number }) {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: SOLUTION_CHANNELS.GET_SOLUTION_METADATA,
        args: [request]
      });
    }
  }

  async getSolutionIntegrations(request: { solutionId: number }) {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: SOLUTION_CHANNELS.GET_SOLUTION_INTEGRATIONS,
        args: [request]
      });
    }
  }
}
