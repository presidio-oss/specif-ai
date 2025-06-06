import { ipcMain } from "electron";
import { contentGenerationManager } from "../services/content-generation/content-generation.service";
import {
  ContentGenerationProcess,
  ContentGenerationType,
} from "../types/content-generation.types";

export function setupContentGenerationHandlers() {
  ipcMain.handle(
    "content-generation:setStatus",
    async (
      _event,
      solutionId: string,
      type: ContentGenerationType,
      isInProgress: boolean
    ) => {
      contentGenerationManager.setContentGenerationStatus(
        solutionId,
        type,
        isInProgress
      );
      return { success: true };
    }
  );

  ipcMain.handle(
    "content-generation:getStatus",
    async (_event, type: ContentGenerationType) => {
      return contentGenerationManager
        .getActiveContentGenerationProcesses()
        .some((p: ContentGenerationProcess) => p.type === type);
    }
  );

  ipcMain.handle("content-generation:getActiveProcesses", async () => {
    return contentGenerationManager.getActiveContentGenerationProcesses();
  });

  ipcMain.handle("content-generation:isAnyInProgress", async () => {
    return contentGenerationManager.isAnyContentGenerationInProgress();
  });

  ipcMain.handle("content-generation:getActiveProcessNames", async () => {
    return contentGenerationManager.getActiveContentGenerationProcessNames();
  });

  ipcMain.handle("content-generation:clearAll", async () => {
    contentGenerationManager.clearAllContentGenerationProcesses();
    return { success: true };
  });
}

export function isAnyContentGenerationInProgress(): boolean {
  return contentGenerationManager.isAnyContentGenerationInProgress();
}

export function getActiveContentGenerationProcessNames(): string[] {
  return contentGenerationManager.getActiveContentGenerationProcessNames();
}
