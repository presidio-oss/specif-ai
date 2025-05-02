import fs from "node:fs";
import { arePathsEqual, ensureSettingsDirectoryExists } from "../utils/file";
import { FILE_NAME } from "../constants/app.constants";

type OnConfigChangeCallback = (payload: {type: "global"}|{type: "project", projectId: string}) => Promise<void>;

export class MCPFileWatcher {
  private getSettingsDirectoryPath: () => Promise<string>;
  private onConfigChange: OnConfigChangeCallback;
  private watcher: fs.FSWatcher | null = null;
  private currentProjectId: string | null = null;

  constructor(onConfigChange: OnConfigChangeCallback) {
    this.getSettingsDirectoryPath = ensureSettingsDirectoryExists;
    this.onConfigChange = onConfigChange;
  }

  async watchMCPConfigFiles(projectId: string | null) {
    // Stop the current watcher if it exists
    await this.stopWatcher();

    this.currentProjectId = projectId;
    const settingsFolderPath = await this.getSettingsDirectoryPath();

    this.watcher = fs.watch(settingsFolderPath, (eventType, filename) => {
      console.debug(`Received event from watcher - ${eventType}: ${filename}`);

      if (filename) {
        if (arePathsEqual(filename, FILE_NAME.GLOBAL_MCP_SETTINGS)) {
          void this.onConfigChange({type: "global"});
        }

        if (this.currentProjectId && arePathsEqual(filename, FILE_NAME.PROJECT_MCP_SETTINGS(this.currentProjectId))) {
          void this.onConfigChange({type: "project", projectId: this.currentProjectId});
        }
      }
    });

    console.log(`Started watching MCP config files for project: ${projectId || 'global'}`);
  }

  async stopWatcher() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('Stopped MCP config file watcher');
    }
  }
}
