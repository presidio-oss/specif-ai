import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { ContentGenerationType } from "./types/content-generation.types";

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
  verifyLLMConfig: (provider: string, config: Record<string, any>) =>
    ipcRenderer.invoke("core:verifyLLMConfig", { provider, config }),
  verifyLangfuseConfig: (config: any) =>
    ipcRenderer.invoke("core:verifyLangfuseConfig", config),
  getAppConfig: () => ipcRenderer.invoke("core:getAppConfig"),
  chat: (data: any) => ipcRenderer.invoke("core:chat", data),
};

const requirementListeners = {
  updateRequirement: (data: any) =>
    ipcRenderer.invoke("requirement:update", data),
  chatUpdateRequirement: (data: any) =>
    ipcRenderer.invoke("requirement:chat", data),
  addRequirement: (data: any) =>
    ipcRenderer.invoke("requirement:add", data),
  addBusinessProcess: (data: any) =>
    ipcRenderer.invoke("requirement:bp-add", data),
  updateBusinessProcess: (data: any) =>
    ipcRenderer.invoke("requirement:bp-update", data),
};

const featureListeners = {
  createStories: (data: any) =>
    ipcRenderer.invoke("story:create", data),
  updateStory: (data: any) =>
    ipcRenderer.invoke("story:update", data),
  chatUserStoryTask: (data: any) =>
    ipcRenderer.invoke("story:chat", data),
  addUserStory: (data: any) =>
    ipcRenderer.invoke("story:add", data),
  createTask: (data: any) =>
    ipcRenderer.invoke("task:create", data),
  addTask: (data: any) =>
    ipcRenderer.invoke("task:add", data),
};

const visualizationListeners = {
  createFlowchart: (data: any) =>
    ipcRenderer.invoke("visualization:flowchart", data),
};

const solutionListeners = {
  createSolution: (data: any) =>
    ipcRenderer.invoke("solution:createSolution", data),
};

const contentGenerationListeners = {
  setContentGenerationStatus: (
    solutionId: string,
    type: ContentGenerationType,
    isInProgress: boolean
  ) =>
    ipcRenderer.invoke(
      "content-generation:setStatus",
      solutionId,
      type,
      isInProgress
    ),
  getContentGenerationStatus: (type: ContentGenerationType) =>
    ipcRenderer.invoke("content-generation:getStatus", type),
  getActiveContentGenerationProcesses: () =>
    ipcRenderer.invoke("content-generation:getActiveProcesses"),
  isAnyContentGenerationInProgress: () =>
    ipcRenderer.invoke("content-generation:isAnyInProgress"),
  getActiveContentGenerationProcessNames: () =>
    ipcRenderer.invoke("content-generation:getActiveProcessNames"),
  clearAllContentGenerationProcesses: () =>
    ipcRenderer.invoke("content-generation:clearAll"),
};

const appAutoUpdaterListeners = {
  checkForUpdates: () =>
    ipcRenderer.invoke("app-updater:check-for-updates"),
  downloadUpdates: (data: any) =>
    ipcRenderer.invoke("app-updater:download-updates", data)
}

const mcpListeners = {
  listMCPServers: (filters?: Record<string, string>) =>
    ipcRenderer.invoke("mcp:listMCPServers", { filters }),
  validateMCPSettings: () => ipcRenderer.invoke("mcp:validateMCPSettings"),
  setProjectId: () => ipcRenderer.invoke("mcp:setProjectId"),
}

const windowListeners = {
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
    ipcRenderer.on("fullscreen-change", (_event, isFullscreen) => callback(isFullscreen));
  },
  removeFullscreenListener: () => {
    ipcRenderer.removeAllListeners("fullscreen-change");
  },
  getFullscreenState: () => ipcRenderer.invoke("window:get-fullscreen"),
  getPlatform: () => process.platform
};

const electronAPI = {
  ...electronListeners,
  ...coreListeners,
  ...requirementListeners,
  ...solutionListeners,
  ...contentGenerationListeners,
  ...visualizationListeners,
  ...featureListeners,
  ...appAutoUpdaterListeners,
  ...mcpListeners,
  ...windowListeners
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
