import { MCPConnection } from "./mcp-connection";
import { MCPServerOptions, MCPServerDetails, MCPSettings } from "./types";

export class MCPConnectionManager {
  private connections: Map<string, MCPConnection> = new Map();

  createConnection(id: string, options: MCPServerOptions): MCPConnection {
    if (!this.connections.has(id)) {
      const connection = new MCPConnection(id, options);
      this.connections.set(id, connection);
      return connection;
    } else {
      return this.connections.get(id)!;
    }
  }

  getConnection(id: string) {
    return this.connections.get(id);
  }

  async removeConnection(id: string) {
    const connection = this.connections.get(id);
    if (connection) {
      await connection.client.close();
    }
    this.connections.delete(id);
  }

  async refreshConnection(serverId: string): Promise<void> {
    const connection = this.getConnection(serverId);
    if (!connection) {
      throw new Error(`MCP Connection ${serverId} not found`);
    }
    await connection.connectClient(true, new AbortController().signal);
  }

  async refreshConnections(force: boolean) {
    const abortController = new AbortController();
    await Promise.race([
      new Promise((resolve) => {
        abortController.signal.addEventListener("abort", () => {
          resolve(undefined);
        });
      }),
      (async () => {
        await Promise.all(
          Array.from(this.connections.values()).map(async (connection) => {
            await connection.connectClient(force, abortController.signal);
          })
        );
      })(),
    ]);
  }

  async validateMCPSettings(
    mcpSettings: Record<string, MCPServerOptions>
  ): Promise<MCPServerDetails[]> {
    const results: MCPServerDetails[] = [];

    for (const [id, serverOptions] of Object.entries(mcpSettings)) {
      const tempConnection = new MCPConnection(id, serverOptions);

      try {
        await tempConnection.connectClient(true, new AbortController().signal);
        const connDetails = tempConnection.getDetails();
        results.push(connDetails);
      } catch (error) {
        console.error(
          `Error connecting to mcp server with id ${id} - error : ${error}`
        );
        results.push({
          ...serverOptions,
          id,
          status: "error",
          errors: [
            `Connection failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
          tools: [],
          resources: [],
        } as any);
      } finally {
        await tempConnection.client.close();
      }
    }

    return results;
  }

  listConnections() {
    return this.connections;
  }

  async updateConnectionsFromSettings(
    mcpSettings: MCPSettings
  ): Promise<boolean> {
    const mcpServers = mcpSettings["mcpServers"];
    // Remove connections not in the new settings
    for (const id of this.connections.keys()) {
      if (!mcpServers[id]) {
        console.log(`Removing connection: ${id}`);
        await this.removeConnection(id);
      }
    }

    // Add and update new connections from the settings
    for (const [id, serverOptions] of Object.entries(mcpServers)) {
      const existingConnection = this.getConnection(id);
      
      if (!existingConnection) {
        console.log(`Adding new connection: ${id}`);
        this.createConnection(id, serverOptions);
      } else {
        // Check if the options have changed
        if (existingConnection.hasOptionsChanged(serverOptions)) {
          console.log(`Updating existing connection: ${id}`);
          await this.removeConnection(id);
          this.createConnection(id, serverOptions);
        } else {
          console.log(`Connection ${id} already exists with matching options`);
        }
      }
    }

    // Refresh all connections
    console.log("Refreshing connections...");
    await this.refreshConnections(true);

    // Always return true as connections are refreshed
    return true;
  }

  async closeAllConnections() {
    try {
      await this.updateConnectionsFromSettings({ mcpServers: {} });
    } catch (error) {
      console.warn("Error closing mcp connections");
    }
  }
}
