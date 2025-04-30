import { app } from "electron";
import { MCPConnection } from "./mcp-connection";

const getApplicationUserDataPath = () => {
  return `${app.getPath("appData")}/${app.getName()}`;
};

export const getGlobalMCPSettingsFilePath = () => {
  return `${getApplicationUserDataPath()}/Settings/mcp/global_mcp_settings.json`;
};

export const getMCPToolsFromConnections = async (
  connections: Array<[string, MCPConnection]>,
  provider?: string
) => {
  let tools: Array<any> = [];
  for (const [_, connection] of connections) {
    // ignore connections whose tools are disabled
    // TODO: shall we not connect to them in the first place?
    if (connection.disabled) {
      console.log("skipping this connection as this is disabled", connection.getDetails().id);
      continue;
    }

    const serverTools = connection?.listTools(provider) ?? [];
    const serverResourcesAsTools = connection?.listResourcesAsTools() ?? [];
    tools = [...tools, ...serverTools, ...serverResourcesAsTools];
  }

  return tools;
};
