import { ipcMain } from "electron";
import { MCPHub } from "../mcp/mcp-hub";
import { MCPSettings } from "../mcp/types";

export function setupMcpHandlers() {
  ipcMain.handle("mcp:setProjectId", async (_event, projectId: string) => {
    try {
      console.log("setting mcp projectId", projectId);
      const mcpHub = MCPHub.getInstance();
      await mcpHub.setProjectId(projectId);
      return { success: true };
    } catch (error: any) {
      console.error("Failed to set project ID in MCP Hub:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "mcp:listMCPServers",
    async (_event, filters?: Record<string, string>) => {
      try {
        const mcpHub = MCPHub.getInstance();
        const mcpServers = mcpHub.listMCPServerDetails(filters);
        return mcpServers;
      } catch (error: any) {
        console.error("Error handling mcp:listMCPServers:", error.message);
        throw error;
      }
    }
  );

  ipcMain.handle("mcp:validateMCPSettings", async (_event, mcpSettings: MCPSettings) => {
    try {
      const mcpHub = MCPHub.getInstance();
      const validationResults = await mcpHub.validateMCPSettings(mcpSettings);
      return validationResults;
    } catch (error: any) {
      console.error("Error handling mcp:validateMCPSettings:", error.message);
      throw error;
    }
  });
}
