import { MCPHub } from "./mcp-hub";

export const getMCPTools = async (provider?: string) => {
  const mcpManager = MCPHub.getInstance();

  let tools: Array<any> = [];

  const connections = await mcpManager.listConnections();
  
  for (const [_, connection] of connections) {
    // ignore connections whose tools are disabled
    // TODO: shall we not connect to them in the first place?
    if (connection.disabled) {
      console.log("skipping this connection as this is disabled");
      continue;
    }

    const serverTools = connection?.listTools(provider) ?? [];
    const serverResourcesAsTools = connection?.listResourcesAsTools() ?? [];
    tools = [...tools, ...serverTools, ...serverResourcesAsTools];
  }

  return tools;
};
