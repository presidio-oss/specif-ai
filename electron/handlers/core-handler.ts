import { verifyConfig } from "../api/core/verify-config";
import { verifyLangfuseConfig } from "../api/core/verify-langfuse-config";
import { getSuggestions } from "../api/core/get-suggestions";
import { getAppConfig } from "../api/core/get-app-config";
import { chatWithAI } from "../api/core/chat";
import { ipcMain, IpcMainInvokeEvent } from "electron";

export function setupCoreHandlers() {
  ipcMain.handle('core:getSuggestions', async (_event, data: any) => {
    try {
      const result = await getSuggestions(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling core:getSuggestions:', error.message);
      throw error;
    }
  });

  ipcMain.handle('core:verifyLLMConfig', async (_event, data: any) => {
    try {
      const result = await verifyConfig(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling core:verifyLLMConfig:', error.message);
      throw error;
    }
  });

  ipcMain.handle('core:getAppConfig', async (_event) => {
    try {
      const result = await getAppConfig(_event);
      return result;
    } catch (error: any) {
      console.error('Error handling core:getAppConfig:', error.message);
      throw error;
    }
  });

  ipcMain.handle('core:chat', async (_event: IpcMainInvokeEvent, data: any) => {
    try {
      const result = await chatWithAI(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling core:chat:', error.message);
      throw error;
    }
  });

  ipcMain.handle('core:verifyLangfuseConfig', async (_event, data: any) => {
    try {
      const result = await verifyLangfuseConfig(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling core:verifyLangfuseConfig:', error.message);
      throw error;
    }
  });
}
