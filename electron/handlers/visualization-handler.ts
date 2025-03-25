import { ipcMain } from "electron";
import { createFlowchart } from "../api/visualization/flowchart";

export function setupVisualizationHandlers() {
  ipcMain.handle('visualization:flowchart', async (_event, data: any) => {
    try {
      const result = await createFlowchart(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling visualization:flowchart:', error.message);
      throw error;
    }
  });
}
