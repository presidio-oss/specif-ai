import { ipcMain } from "electron";
import { createSolution, abortSolutionCreation } from "../api/solution/create";
import { validateBedrock } from "../api/solution/validate-bedrock";

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

  ipcMain.handle('solution:abortSolutionCreation', async (_event, data: any) => {
    try {
      const result = await abortSolutionCreation(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling solution:abortSolutionCreation:', error.message);
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
}
