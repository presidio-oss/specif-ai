import { ensureSettingsDirectoryExists } from "../utils/file";
import { MCPHub } from "./mcp-hub";

export const getMCPTools = async (provider?: string) => {
  const mcpManager = MCPHub.getInstance(() => ensureSettingsDirectoryExists());

  let tools: Array<any> = [];

  const connections = await mcpManager.listConnections();

  for (const [_, connection] of connections) {
    const serverTools = connection?.listTools(provider) ?? [];
    const serverResourcesAsTools = connection?.listResourcesAsTools() ?? [];
    tools = [...tools, ...serverTools, ...serverResourcesAsTools];
  }

  return tools;
};
