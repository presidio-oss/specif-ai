import { ipcMain } from "electron";
import { store } from "../services/store";
import { AppConfig } from "../schema/core/store.schema";
import { appendUsecaseRequirement } from "../utils/file";
import { StrategicInitiativeDraftSchema } from "../schema/core/strategic-initiative.schema";
import { generateUseCase } from "../api/core/usecase";

export function setupSIHandlers() {
  // TODO: remove this and use CreateFile from ui
  ipcMain.handle("strategic-initiative:add", async (_, payload) => {
    const APP_CONFIG = store.get<AppConfig>("APP_CONFIG");
    const WORKING_DIR: string = APP_CONFIG?.directoryPath || "";
    const parsed = await StrategicInitiativeDraftSchema.parseAsync(payload);
    return appendUsecaseRequirement(WORKING_DIR, parsed);
  });

  ipcMain.handle("strategic-initiative:generate", generateUseCase);
}
