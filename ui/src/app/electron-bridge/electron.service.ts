import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { IpcRendererEvent } from 'electron';
import { MCPServerDetails, MCPSettings } from '../types/mcp.types';
import { ToasterService } from '../services/toaster/toaster.service';
import { Router } from '@angular/router';
import { DialogService } from '../services/dialog/dialog.service';
import { IpcInterceptor } from '../interceptor/ipc.interceptor';
import { PortErrorDialogComponent } from 'src/app/components/port-error-dialog/port-error-dialog.component';
import { BedrockValidationPayload, ChatWithAIResponse, suggestionPayload } from 'src/app/model/interfaces/chat.interface';
import {
  ICreateSolutionRequest,
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
  ChatWithAIPayload,
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
import { WorkflowType } from '../model/interfaces/workflow-progress.interface';
import { IAddUseCaseRequest, IUpdateUseCaseRequest, IUseCaseResponse } from '../model/interfaces/IUseCase';
import { DocumentUpdateRequest, DocumentUpdateResponse } from './electron.interface';
import { v4 as uuidv4 } from 'uuid';

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
        skipLoading: true,
      });
    }
    throw new Error('Electron is not available');
  }

  async abortSolutionCreation(projectId: string): Promise<boolean> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'solution:abortSolutionCreation',
        args: [{ projectId }],
        skipLoading: true,
      });
    }
    throw new Error('Electron is not available');
  }

  
  async setContentGenerationStatus(
    solutionId: string,
    type: WorkflowType,
    isInProgress: boolean,
  ): Promise<void> {
    if (this.electronAPI) {
      await this.electronAPI.setContentGenerationStatus(
        solutionId,
        type,
        isInProgress,
      );
    }
  }

  async getContentGenerationStatus(type: WorkflowType): Promise<boolean> {
    if (this.electronAPI) {
      return await this.electronAPI.getContentGenerationStatus(type);
    }
    return false;
  }

  async getActiveContentGenerationProcesses(): Promise<any[]> {
    if (this.electronAPI) {
      return await this.electronAPI.getActiveContentGenerationProcesses();
    }
    return [];
  }

  async isAnyContentGenerationInProgress(): Promise<boolean> {
    if (this.electronAPI) {
      return await this.electronAPI.isAnyContentGenerationInProgress();
    }
    return false;
  }

  async getActiveContentGenerationProcessNames(): Promise<string[]> {
    if (this.electronAPI) {
      return await this.electronAPI.getActiveContentGenerationProcessNames();
    }
    return [];
  }

  async clearAllContentGenerationProcesses(): Promise<void> {
    if (this.electronAPI) {
      await this.electronAPI.clearAllContentGenerationProcesses();
    }
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

  async createTestCases(
    request: any,
  ): Promise<any> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'workflow:invoke',
        args: [{ 
          type: 'test-case',
          ...request
        }],
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

  async addUseCase(
    request: IAddUseCaseRequest,
  ): Promise<IUseCaseResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'usecase:add',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async updateUseCase(
    request: IUpdateUseCaseRequest,
  ): Promise<IUseCaseResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'usecase:update',
        args: [request],
      });
    }
    throw new Error('Electron is not available');
  }

  async generateUseCase(
    request: any,
  ): Promise<{title: string; requirement: string; status: string}> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'usecase:generate',
        args: [request],
        skipLoading: true
      });
    }
    throw new Error('Electron is not available');
  }

  /**
   * Update a document with search and replace or range replace
   * @param request The document update request
   * @returns The document update response
   */
  async updateDocument(request: DocumentUpdateRequest): Promise<DocumentUpdateResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'core:updateDocument',
        args: [request],
        skipLoading: true
      });
    }
    throw new Error('Electron is not available');
  }

  /**
   * Search for text in a document and replace it with new text
   * @param documentId The ID of the document to update
   * @param searchText The text to search for
   * @param replaceText The text to replace it with
   * @param highlightChanges Whether to highlight the changes in the UI
   * @returns The document update response
   */
  async searchAndReplaceText(
    documentId: string,
    searchText: string,
    replaceText: string,
    highlightChanges: boolean = true
  ): Promise<DocumentUpdateResponse> {
    const request: DocumentUpdateRequest = {
      requestId: uuidv4(),
      documentId,
      updateType: 'search_replace',
      searchText,
      replaceText,
      highlightChanges
    };
    
    return this.updateDocument(request);
  }

  /**
   * Replace text within a specific character range in a document
   * @param documentId The ID of the document to update
   * @param startPosition The starting character position
   * @param endPosition The ending character position
   * @param replaceText The text to replace the selected range with
   * @param highlightChanges Whether to highlight the changes in the UI
   * @returns The document update response
   */
  async replaceTextRange(
    documentId: string,
    startPosition: number,
    endPosition: number,
    replaceText: string,
    highlightChanges: boolean = true
  ): Promise<DocumentUpdateResponse> {
    const request: DocumentUpdateRequest = {
      requestId: uuidv4(),
      documentId,
      updateType: 'range_replace',
      startPosition,
      endPosition,
      replaceText,
      highlightChanges
    };
    
    return this.updateDocument(request);
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

  async chatWithAI(request: ChatWithAIPayload): Promise<ChatWithAIResponse> {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'core:chat',
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

  async verifyLangfuseConfig(config: any) {
    if (this.electronAPI) {
      return this.ipc.request({
        channel: 'core:verifyLangfuseConfig',
        args: [config],
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

  async listMCPServers(filter?: Record<string, any>): Promise<MCPServerDetails[]> {
    if (!this.electronAPI) {
      throw new Error('Electron is not available');
    }

    return this.ipc.request({
      channel: 'mcp:listMCPServers',
      args: [filter], // Pass the filter object
      skipLoading: true
    });
  }

  async validateMCPSettings(mcpSettings: MCPSettings): Promise<MCPServerDetails[]> {
    if (!this.electronAPI) {
      throw new Error('Electron is not available');
    }

    return this.ipc.request({
      channel: 'mcp:validateMCPSettings',
      args: [mcpSettings],
      skipLoading: true
    });
  }

  async updateProjectMCPSettings(projectId: string, settings: MCPSettings): Promise<{ success: boolean; error?: string }> {
    if (!this.electronAPI) {
      throw new Error('Electron is not available');
    }
    return this.ipc.request({
      channel: 'mcp:updateProjectSettings',
      args: [projectId, settings],
      skipLoading: true
    });
  }

  async getProjectMCPSettings(projectId: string): Promise<{ success: boolean; settings?: MCPSettings; error?: string }> {
    if (!this.electronAPI) {
      throw new Error('Electron is not available');
    }
    return this.ipc.request({
      channel: 'mcp:getProjectSettings',
      args: [projectId],
      skipLoading: true
    });
  }

  async setMCPProjectId(projectId: string): Promise<void> {
    if (!this.electronAPI) {
      throw new Error('Electron is not available');
    }

    console.log("setting project id", projectId)

    return this.ipc.request({
      channel: 'mcp:setProjectId',
      args: [projectId],
      skipLoading: true
    });
  }

  listenChatEvents(id: string, callback: (event: IpcRendererEvent, response: any) => void): void {
    if (this.electronAPI) {
      this.electronAPI.on(this.buildChatStreamChannel(id), callback);
    }
  }

  removeChatListener(id: string, callback: (event: IpcRendererEvent, response: any) => void): void {
    if (this.electronAPI) {
      this.electronAPI.removeListener(this.buildChatStreamChannel(id), callback);
    }
  }

  private buildChatStreamChannel(id:string){
    return `core:${id}-chatStream`;
  }

  private buildWorkflowProgressChannel(
    workflowType: WorkflowType,
    solutionId: string,
  ) {
    return `${workflowType}:${solutionId}-workflow-progress`;
  }

  listenWorkflowProgress(
    workflowType: WorkflowType,
    solutionId: string,
    callback: (event: IpcRendererEvent, response: any) => void,
  ): (event: IpcRendererEvent, ...args: any[]) => void {
    if (this.electronAPI) {
      return this.electronAPI.on(
        this.buildWorkflowProgressChannel(workflowType, solutionId),
        callback,
      );
    }
    throw new Error('Electron is not available');
  }

  removeWorkflowProgressListener(
    workflowType: WorkflowType,
    solutionId: string,
    callback: (event: IpcRendererEvent, response: any) => void,
  ): void {
    if (this.electronAPI) {
      this.electronAPI.removeListener(
        this.buildWorkflowProgressChannel(workflowType, solutionId),
        callback,
      );
    }
  }

  async openExternalUrl(url: string): Promise<boolean> {
    if (!this.electronAPI) {
      throw new Error('Electron is not available');
    }
    return this.electronAPI.invoke('open-external-url', url);
  }

  onFullscreenChange(callback: (isFullscreen: boolean) => void): void {
    if (this.electronAPI) {
      this.electronAPI.onFullscreenChange(callback);
    }
  }

  removeFullscreenListener(): void {
    if (this.electronAPI) {
      this.electronAPI.removeFullscreenListener();
    }
  }

  async getFullscreenState(): Promise<boolean> {
    if (this.electronAPI) {
      return this.electronAPI.getFullscreenState();
    }
    return false;
  }

  getPlatform(): string {
    if (this.electronAPI) {
      return this.electronAPI.getPlatform();
    }
    return '';
  }
}
