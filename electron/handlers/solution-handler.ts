import { ipcMain } from "electron";
import { createSolution } from "../api/solution/create";
import { validateBedrock } from "../api/solution/validate-bedrock";
import { DatabaseClient } from "../db";

export function setupSolutionHandlers() {
  ipcMain.handle('solution:createSolution', async (_event, data: any) => {
    try {
      const result = await createSolution(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling solution:createSolution:', error.message);
      throw error;
    }
  });

  ipcMain.handle('solution:validateBedrock', async (_event, data: any) => {
    try {
      const result = await validateBedrock(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling solution:validateBedrock:', error.message);
      throw error;
    }
  });

  ipcMain.handle("solution:setRootDir", async (_event) => {
    try {
      const dbClient = DatabaseClient.getInstance();
      dbClient.initializeMasterDb();
      return { success: true };
    } catch (error) {
      console.error("Error setting root directory:", error);
      return { success: false, error: "Failed to set root directory" };
    }
  });
}
