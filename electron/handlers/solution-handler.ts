import { ipcMain } from "electron";
import { createSolution } from "../api/solution/create";

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
}
