import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import fs from "node:fs/promises";
import path from "node:path";
import { FILE_NAME } from "../constants/app.constants";
import { arePathsEqual } from "../utils/file";
import { MCPConnection } from "./mcp-connection";
import { McpSettingsSchema } from "./schema";
import { MCPOptions, MCPServerStatus, MCPSettings } from "./types";

type GetSettingDirectoryPath = () => Promise<string>;

export class MCPHub {
  private static instance: MCPHub;

  // events
  public onConnectionsRefreshed?: () => void;

  // private variables
  private connections: Map<string, MCPConnection> = new Map();

  private getSettingsDirectoryPath: GetSettingDirectoryPath;
  private initializingMCPServersPromise: Promise<void> | null;

  private abortController: AbortController = new AbortController();

  private constructor(getSettingsDirectoryPath: GetSettingDirectoryPath) {
    this.getSettingsDirectoryPath = getSettingsDirectoryPath;
    this.watchGlobalMCPConfigFileForChanges();
    this.initializingMCPServersPromise = this.initializeMCPServers();
  }

  public static getInstance(
    getSettingsDirectoryPath: GetSettingDirectoryPath
  ): MCPHub {
    if (!MCPHub.instance) {
      MCPHub.instance = new MCPHub(getSettingsDirectoryPath);
    }
    return MCPHub.instance;
  }

  async waitForMCPServersInitialization() {
    if (this.initializingMCPServersPromise) {
      try {
        await this.initializingMCPServersPromise;
        this.initializingMCPServersPromise = null;
      } catch (error) {
        console.error("Error initializing mcp servers", error);
        this.initializingMCPServersPromise = null;
      }
    }
  }

  async listConnections() {
    await this.waitForMCPServersInitialization();
    return this.connections.entries();
  }

  createConnection(id: string, options: MCPOptions): MCPConnection {
    if (!this.connections.has(id)) {
      const connection = new MCPConnection(options);
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

  async setConnections(servers: MCPOptions[], forceRefresh: boolean) {
    let refresh = true;

    // Remove any connections that are no longer in config
    Array.from(this.connections.entries()).forEach(([id, connection]) => {
      if (!servers.find((s) => s.id === id)) {
        refresh = true;
        connection.abortController.abort();
        void connection.client.close();
        this.connections.delete(id);
      }
    });

    // Add any connections that are not yet in manager
    servers.forEach((server) => {
      if (!this.connections.has(server.id)) {
        refresh = true;
        this.connections.set(server.id, new MCPConnection(server));
      }
    });

    // NOTE the id is made by stringifying the options
    if (refresh) {
      await this.refreshConnections(forceRefresh);
    }
  }

  async refreshConnection(serverId: string) {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`MCP Connection ${serverId} not found`);
    }
    await connection.connectClient(true, this.abortController.signal);
    if (this.onConnectionsRefreshed) {
      this.onConnectionsRefreshed();
    }
  }

  async refreshConnections(force: boolean) {
    this.abortController.abort();
    this.abortController = new AbortController();
    await Promise.race([
      new Promise((resolve) => {
        this.abortController.signal.addEventListener("abort", () => {
          resolve(undefined);
        });
      }),
      (async () => {
        await Promise.all(
          Array.from(this.connections.values()).map(async (connection) => {
            await connection.connectClient(force, this.abortController.signal);
          })
        );
        if (this.onConnectionsRefreshed) {
          this.onConnectionsRefreshed();
        }
      })(),
    ]);
  }

  getStatuses(): (MCPServerStatus & { client: Client })[] {
    return Array.from(this.connections.values()).map((connection) => ({
      ...connection.getStatus(),
      client: connection.client,
    }));
  }

  // mcp settings helpers

  getMCPSettingsFilePath = async (settingsPath: string): Promise<string> => {
    const mcpSettingsFilePath = path.join(
      settingsPath,
      FILE_NAME.GLOBAL_MCP_SETTINGS
    );
    return mcpSettingsFilePath;
  };

  watchGlobalMCPConfigFileForChanges = async () => {
    const settingsFolderPath = await this.getSettingsDirectoryPath();

    // watch the settings folder for changes
    for await (const event of fs.watch(settingsFolderPath)) {
      console.debug(`Received event from watcher - ${event}`);
      if (
        event.filename &&
        arePathsEqual(event.filename, FILE_NAME.GLOBAL_MCP_SETTINGS)
      ) {
        console.debug(`Global mcp settings file changed, will read again`);
        const latestGlobalMCPSettings = await this.readGlobalMCPSettings();
        console.debug(`read - ${JSON.stringify(latestGlobalMCPSettings)}`);

        if (latestGlobalMCPSettings) {
          this.setConnections(latestGlobalMCPSettings.servers, true);
        }
      }
    }
  };

  private async initializeMCPServers(): Promise<void> {
    const settings = await this.readGlobalMCPSettings();

    if (settings) {
      await this.setConnections(settings.servers, true);
    }
  }

  readGlobalMCPSettings = async (): Promise<MCPSettings | undefined> => {
    const settingsFolderPath = await this.getSettingsDirectoryPath();
    const globalMCPSettingsPath = await this.getMCPSettingsFilePath(
      settingsFolderPath
    );

    try {
      const mcpSettingsStringified = await fs.readFile(
        globalMCPSettingsPath,
        "utf-8"
      );
      const mcpSettings = McpSettingsSchema.parse(
        JSON.parse(mcpSettingsStringified)
      );
      return mcpSettings;
    } catch (error) {
      console.warn(`Error reading global mcp settings file ${error}`);

      if (error instanceof Error) {
        const code = (error as NodeJS.ErrnoException).code;

        if (code === "ENOENT") {
          console.log(
            `Global mcp settings file not found, so removing all mcp servers`
          );
          // File is removed so we want to clear all the servers at this point
          return { servers: [] };
        }
      }
    }
  };
}
