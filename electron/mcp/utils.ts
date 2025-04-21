import { app } from "electron";

const getApplicationUserDataPath = () => {
  return `${app.getPath("appData")}/${app.getName()}`;
};

export const getGlobalMCPSettingsFilePath = () => {
  return `${getApplicationUserDataPath()}/Settings/mcp/global_mcp_settings.json`;
};
