import { verifyConfig } from "../api/core/verify-config";
import { getSuggestions } from "../api/core/get-suggestions";
import { ipcMain } from "electron";

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
}