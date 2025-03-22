import { ipcMain } from "electron";
import { updateRequirement } from "../api/requirement/update-requirement";

export function setupRequirementHandlers() {
  ipcMain.handle('requirement:updateRequirement', async (_event, data: any) => {
    try {
      const result = await updateRequirement(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling requirement:updateRequirement:', error.message);
      throw error;
    }
  });
}
