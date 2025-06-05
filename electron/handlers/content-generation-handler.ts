import { ipcMain } from "electron";
import {
  contentGenerationManager,
  ContentGenerationProcess,
} from "../utils/content-generation-manager";

export function setupContentGenerationHandlers() {
  ipcMain.handle(
    "content-generation:setStatus",
    async (
      _event,
      type: ContentGenerationProcess["type"],
      isInProgress: boolean
    ) => {
      contentGenerationManager.setProcessStatus(type, isInProgress);
      return { success: true };
    }
  );

  ipcMain.handle(
    "content-generation:getStatus",
    async (_event, type: ContentGenerationProcess["type"]) => {
      return contentGenerationManager
        .getActiveProcesses()
        .some((p) => p.type === type);
    }
  );

  ipcMain.handle("content-generation:getActiveProcesses", async () => {
    return contentGenerationManager.getActiveProcesses();
  });

  ipcMain.handle("content-generation:isAnyInProgress", async () => {
    return contentGenerationManager.isAnyProcessInProgress();
  });

  ipcMain.handle("content-generation:getActiveProcessNames", async () => {
    return contentGenerationManager.getActiveProcessNames();
  });

  ipcMain.handle("content-generation:clearAll", async () => {
    contentGenerationManager.clear();
    return { success: true };
  });
}

export function isAnyContentGenerationInProgress(): boolean {
  return contentGenerationManager.isAnyProcessInProgress();
}

export function getActiveContentGenerationProcessNames(): string[] {
  return contentGenerationManager.getActiveProcessNames();
}
