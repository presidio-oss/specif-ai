import { ipcMain } from "electron";
import { updateRequirement } from "../api/requirement/update-requirement";
import { chatUpdateRequirement } from "../api/requirement/chat-update";

export function setupRequirementHandlers() {
  ipcMain.handle('requirement:update', async (_event, data: any) => {
    try {
      const result = await updateRequirement(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling requirement:update:', error.message);
      throw error;
    }
  });

  ipcMain.handle('requirement:chat', async (_event, data: any) => {
    try {
      const result = await chatUpdateRequirement(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling requirement:chat:', error.message);
      throw error;
    }
  });
}
