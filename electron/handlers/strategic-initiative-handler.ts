import { ipcMain } from "electron";
import { generateStrategicInitiative } from "../api/core/strategic-initiative";

export function setupSIHandlers() {
  ipcMain.handle("strategic-initiative:generate", async (_event, data: any) => {
    try {
      const result = await generateStrategicInitiative(_event, data);
      return result;
    } catch (error: any) {
      console.error("Error handling solution:createSolution:", error.message);
      throw error;
    }
  });
}
