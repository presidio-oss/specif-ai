import { ipcMain } from "electron";
import { store } from "../services/store";
import { AppConfig } from "../schema/core/store.schema";
import { appendUsecaseRequirement } from "../utils/file";
import { UsecaseDraftSchema } from "../schema/core/usecase.schema";
import { generateUseCase } from "../api/core/usecase";

export function setupUsecaseHandlers() {
  ipcMain.handle("usecase:add", async (_, payload) => {
    const APP_CONFIG = store.get<AppConfig>("APP_CONFIG");
    const WORKING_DIR: string = APP_CONFIG?.directoryPath || "";
    const parsed = await UsecaseDraftSchema.parseAsync(payload);
    return appendUsecaseRequirement(WORKING_DIR, parsed);
  });

  ipcMain.handle("usecase:generate", generateUseCase);
}
