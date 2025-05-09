import { ipcMain, dialog } from "electron";
import { utilityFunctionMap } from "../file-system.utility";
import fs from "fs";

export function setupFileSystemHandlers() {
  ipcMain.handle("dialog:openFile", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({});
    if (canceled) {
      return null;
    } else {
      const filePath = filePaths[0];
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return { filePath, fileContent };
    }
  });

  ipcMain.handle(
    "dialog:saveFile",
    async (_event, fileContent: string, options: { rootPath: string; fileName: string; } | null) => {
      if (!options) return null;

      let filePath = options.rootPath;

      if (!filePath) {
        const response = await dialog.showSaveDialog({});
        filePath = response.filePath || '';
        if (response.canceled) {
          return null;
        }
      }

      const dirForSave = `${filePath}/${options.fileName.split(options.fileName.split("/").pop()!)[0]}`;
      if (!fs.existsSync(dirForSave)) {
        fs.mkdirSync(dirForSave, { recursive: true });
      }
      fs.writeFileSync(`${filePath}/${options.fileName}`, fileContent, "utf-8");
      return filePath;
    }
  );

  ipcMain.handle("dialog:openDirectory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled) {
      return [];
    } else {
      return filePaths;
    }
  });

  ipcMain.handle("invokeCustomFunction", async (_event, message: { functionName: string; params: any; }) => {
    console.debug("message on invokeCustomFunction.");
    // console.debug("map: ", utilityFunctionMap);
    const fn = utilityFunctionMap[message.functionName as keyof typeof utilityFunctionMap];
    return fn(message.params);
  });
}
