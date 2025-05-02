export const PATHS = {
  APP_SETTINGS: "Settings",
};

export const FILE_NAME = {
  GLOBAL_MCP_SETTINGS: "global_mcp_settings.json",
  PROJECT_MCP_SETTINGS: (projectId: string) => `${projectId}_mcp_settings.json`,
};
