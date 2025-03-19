const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  getSuggestions: (data) => ipcRenderer.invoke("chat:getSuggestions", data),
  saveFile: (fileContent, filePath) =>
    ipcRenderer.invoke("dialog:saveFile", fileContent, filePath),
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  getStoreValue: (key) => ipcRenderer.invoke("store-get", "APP_CONFIG"),
  setStoreValue: (key, value) => ipcRenderer.invoke("store-set", key, value),
  loadURL: (serverConfig) => ipcRenderer.send("load-url", serverConfig),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  once: (channel, listener) => ipcRenderer.once(channel, listener),
  removeListener: (channel, listener) =>
    ipcRenderer.removeListener(channel, listener),
});
