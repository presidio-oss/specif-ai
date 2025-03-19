import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

type IpcListener = (event: IpcRendererEvent, ...args: any[]) => void;

interface ElectronAPI {
  openFile: () => Promise<{ filePath: string; fileContent: string } | null>;
  getSuggestions: (data: any) => Promise<any>;
  saveFile: (fileContent: string, filePath: { rootPath: string; fileName: string } | null) => Promise<string | null>;
  openDirectory: () => Promise<string[]>;
  getStoreValue: (key: string) => Promise<any>;
  setStoreValue: (key: string, value: any) => Promise<boolean>;
  loadURL: (serverConfig: string) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: IpcListener) => void;
  once: (channel: string, listener: IpcListener) => void;
  removeListener: (channel: string, listener: IpcListener) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  getSuggestions: (data: any) => ipcRenderer.invoke('chat:getSuggestions', data),
  saveFile: (fileContent: string, filePath: { rootPath: string; fileName: string } | null) =>
    ipcRenderer.invoke('dialog:saveFile', fileContent, filePath),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  getStoreValue: (key: string) => ipcRenderer.invoke('store-get', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
  loadURL: (serverConfig: string) => ipcRenderer.send('load-url', serverConfig),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, listener: IpcListener) => ipcRenderer.on(channel, listener),
  once: (channel: string, listener: IpcListener) => ipcRenderer.once(channel, listener),
  removeListener: (channel: string, listener: IpcListener) =>
    ipcRenderer.removeListener(channel, listener),
});
