import { ipcMain } from "electron";
import { createSolution } from "../api/solution/create";
import { validateBedrock } from "../api/solution/validate-bedrock";
import { getSolutionByName, getSolutions } from "../api/solution/get";
import type { IpcMainInvokeEvent } from 'electron';
import { masterFactory } from "../db/master.factory";
import { solutionFactory } from "../db/solution.factory";

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
      // Close active database connection
      masterFactory.closeActiveDBConnection()

      // Create new connetion
      masterFactory.setDatabase();

      return { success: true };
    } catch (error) {
      console.error("Error setting root directory:", error);
      return { success: false, error: "Failed to set root directory" };
    }
  });

  ipcMain.handle('solution:getSolutions', async (_event) => {
    try {
      const result = await getSolutions(_event);
      return result;
    } catch (error: any) {
      console.error('Error handling solution:getSolutions:', error.message);
      throw error;
    }
  });

  ipcMain.handle('solution:activate', async (_event: IpcMainInvokeEvent, solutionName: string) => {
    try {
      // Get Master repository instance
      const masterRepo = masterFactory.getRepository()
    
      // Check whether the solution exists
      const solutionDetail = await masterRepo.getSolution({ name: solutionName });
      if (!solutionDetail) {
        throw new Error('Solution does not exists')
      }
    
      // Get Solution repository
      await solutionFactory.setDatabase(solutionDetail.id)

      return { success: true };
    } catch (error: any) {
      console.error('Error activating solution database:', error.message);
      throw error;
    }
  });

  ipcMain.handle('solution:getSolutionByName', async (_event: IpcMainInvokeEvent, solutionName: string, docTypes?: string[]) => {
    try {
      const result = await getSolutionByName(_event, solutionName, docTypes);
      return result;
    } catch (error: any) {
      console.error('Error handling solution:getSolutionByName:', error.message);
      throw error;
    }
  });
}
