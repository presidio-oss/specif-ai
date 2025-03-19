import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { IpcRendererEvent } from 'electron';
import { ToasterService } from '../toaster/toaster.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PortErrorDialogComponent } from 'src/app/components/port-error-dialog/port-error-dialog.component';
import { Observable } from 'rxjs';
import { suggestionPayload } from 'src/app/model/interfaces/chat.interface';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  electronAPI: ElectronAPI | undefined;
  constructor(
    private logger: NGXLogger,
    private toast: ToasterService,
    private router: Router,
    private dialog: MatDialog,
  ) {
    if (this.isElectron()) {
      this.electronAPI = window.electronAPI; // Access Electron APIs through preload
    }
  }

  async getSuggestions(payload: suggestionPayload) {
    if (this.electronAPI) {
      return this.electronAPI.invoke('chat:getSuggestions', payload);
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
          this.dialog.open(PortErrorDialogComponent, {            
            disableClose: true
          });
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
      return await this.electronAPI.invoke('invokeCustomFunction', {
        functionName,
        params: { ...params },
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
}

// Define the ElectronAPI interface within this file
interface ElectronAPI {
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
}

// Extend the global Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
