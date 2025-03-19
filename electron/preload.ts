import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

type IpcListener = (event: IpcRendererEvent, ...args: any[]) => void;

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
