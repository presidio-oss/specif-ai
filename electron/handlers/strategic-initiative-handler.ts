import { ipcMain } from "electron";
import { generateStrategicInitiative } from "../api/core/strategic-initiative";

export function setupSIHandlers() {
  ipcMain.handle("strategic-initiative:generate", generateStrategicInitiative);
}
