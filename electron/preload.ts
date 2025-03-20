import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type IpcListener = (event: IpcRendererEvent, ...args: any[]) => void;

const electronListeners = {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: (
    fileContent: string,
    filePath: { rootPath: string; fileName: string } | null
  ) => ipcRenderer.invoke("dialog:saveFile", fileContent, filePath),
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  getStoreValue: (key: string) => ipcRenderer.invoke("store-get", key),
  setStoreValue: (key: string, value: any) =>
    ipcRenderer.invoke("store-set", key, value),
  removeStoreValue: (key: string) =>
    ipcRenderer.invoke("removeStoreValue", key),
  loadURL: (serverConfig: string) => ipcRenderer.send("load-url", serverConfig),
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, listener: IpcListener) =>
    ipcRenderer.on(channel, listener),
  once: (channel: string, listener: IpcListener) =>
    ipcRenderer.once(channel, listener),
  removeListener: (channel: string, listener: IpcListener) =>
    ipcRenderer.removeListener(channel, listener),
};

const coreListeners = {
  getSuggestions: (data: any) =>
    ipcRenderer.invoke("core:getSuggestions", data),
  verifyLLMConfig: (
    provider: string,
    model: string,
    config?: Record<string, any>
  ) => ipcRenderer.invoke("core:verifyLLMConfig", { provider, model, config }),
  getAppConfig: () => ipcRenderer.invoke("core:getAppConfig"),
};

const requirementListeners = {
  createSolution: (data: any) =>
    ipcRenderer.invoke("requirement:createSolution", data),
};

const electronAPI = {
  ...electronListeners,
  ...coreListeners,
  ...requirementListeners,
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
