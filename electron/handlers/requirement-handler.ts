import { ipcMain } from "electron";
import { createSolution } from "../api/requirement/create";

export function setupRequirementHandlers() {
  ipcMain.handle('requirement:createSolution', async (_event, data: any) => {
    try {
      const result = await createSolution(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling requirement:createSolution:', error.message);
      throw error;
    }
  });
}
