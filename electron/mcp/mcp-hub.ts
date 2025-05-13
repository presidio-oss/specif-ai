import { MCPConnectionManager } from "./mcp-connection-manager";
import { MCPSettingsManager } from "./mcp-settings-manager";
import { MCPFileWatcher } from "./mcp-file-watcher";
import { MCPServerDetails, MCPServerOptions, MCPSettings } from "./types";
import { MCPConnection } from "./mcp-connection";

export class MCPHub {
  private static instance: MCPHub;
  
  private projectId: string | null = null;
  private initializingMCPServersPromise: Promise<void> | null = null;
  
  private connectionManager: MCPConnectionManager;
  private settingsManager: MCPSettingsManager;
  private fileWatcher: MCPFileWatcher;

  private constructor() {
    this.connectionManager = new MCPConnectionManager();
    this.settingsManager = MCPSettingsManager.getInstance();
    this.fileWatcher = new MCPFileWatcher(this.handleConfigChange.bind(this));
    this.initializingMCPServersPromise = this.initializeMCPServers();
    this.waitForMCPServersInitialization();

    // Start watching immediately for global changes
    this.fileWatcher.watchMCPConfigFiles(this.projectId);
  }

  // singleton pattern
  public static getInstance(): MCPHub {
    if (!MCPHub.instance) {
      MCPHub.instance = new MCPHub();
    }

    return MCPHub.instance;
  }

  // Handles configuration file changes detected by the watcher
  private async handleConfigChange(payload: {type: "global"} | {type: "project", projectId: string}) {
    console.log(`Configuration change detected: ${payload.type}`);
    // Re-initialize servers on any config change
    this.initializingMCPServersPromise = this.initializeMCPServers();
    await this.waitForMCPServersInitialization();
  }

  async setProjectId(id: string | null) {
    if (this.projectId !== id) {
        // Stop the current watcher
        await this.fileWatcher.stopWatcher();

        this.projectId = id;
        
        // Re-initialize servers when project ID changes
        this.initializingMCPServersPromise = this.initializeMCPServers();
        await this.waitForMCPServersInitialization();
        
        // Start a new watcher with the new project ID
        await this.fileWatcher.watchMCPConfigFiles(id);
        console.log(`Project ID set to ${id}, watcher restarted with new context.`);
    }
  }

  async waitForMCPServersInitialization() {
    if (this.initializingMCPServersPromise) {
      console.log("Waiting for MCP server initialization...");
      try {
        await this.initializingMCPServersPromise;
        console.log("MCP server initialization complete.");
        this.initializingMCPServersPromise = null; // Clear the promise once resolved
      } catch (error) {
        console.error("Error during MCP server initialization:", error);
        this.initializingMCPServersPromise = null; // Clear promise even on error
        throw error; // Re-throw error for upstream handling if necessary
      }
    }
  }

  // --- Connection Management Delegation ---

  async listConnections() {
    await this.waitForMCPServersInitialization();
    return this.connectionManager.listConnections().entries();
  }

  async createConnection(id: string, options: MCPServerOptions): Promise<MCPConnection> {
    await this.waitForMCPServersInitialization();
    return this.connectionManager.createConnection(id, options);
  }

  async getConnection(id: string): Promise<MCPConnection | undefined> {
    await this.waitForMCPServersInitialization();
    return this.connectionManager.getConnection(id);
  }

  async refreshConnection(serverId: string) {
    await this.waitForMCPServersInitialization();
    await this.connectionManager.refreshConnection(serverId);
  }

  async refreshConnections(force: boolean) {
    await this.waitForMCPServersInitialization();
    await this.connectionManager.refreshConnections(force);
  }

  async readProjectMCPSettings(projectId: string | null): Promise<MCPSettings> {
    return this.settingsManager.readProjectMCPSettings(projectId);
  }

  async writeProjectMCPSettings(projectId: string, mcpSettings: MCPSettings): Promise<void> {
    await this.settingsManager.writeProjectMCPSettings(projectId, mcpSettings);

    if (this.projectId === projectId) {
        console.log(`Project settings changed for current project (${projectId}), re-initializing MCP servers...`);
        this.initializingMCPServersPromise = this.initializeMCPServers();
        await this.waitForMCPServersInitialization();
    } else {
        console.log(`Project settings changed for project ${projectId}, but not the current project (${this.projectId}). No immediate re-initialization needed by the hub.`);
    }
  }

  // --- Initialization and Server Listing ---

  private async initializeMCPServers(): Promise<void> {
    // if initialization already in progress, wait for it to continue and return
    if(this.initializingMCPServersPromise){
      console.log("skipping initializing mcp servers since it is already in progress")
      return await this.waitForMCPServersInitialization();
    }

    console.log("Initializing MCP servers...");
    const globalSettings = await this.settingsManager.readGlobalMCPSettings();
    const projectSettings = await this.settingsManager.readProjectMCPSettings(this.projectId);

    const combinedServers: Record<string, MCPServerOptions> = {};

    // Add global servers first
    for (const [id, serverOptions] of Object.entries(globalSettings?.mcpServers ?? {})) {
      combinedServers[id] = this._addServerMetadata(serverOptions, {
        _hai_mcp_source_type: "global",
      });
    }

    // Add project servers, potentially overriding global ones with the same ID
    for (const [id, serverOptions] of Object.entries(projectSettings?.mcpServers ?? {})) {
      combinedServers[id] = this._addServerMetadata(serverOptions, {
        _hai_mcp_source_type: "project",
        _hai_mcp_source_id: this.projectId,
      });
    }

    console.log("Combined MCP Servers for initialization:", Object.keys(combinedServers));

    await this.connectionManager.updateConnectionsFromSettings({
      "mcpServers": combinedServers
    });

    console.log("MCP server initialization process finished.");
  }

  private _addServerMetadata(
    server: MCPServerOptions,
    metadata: Record<string, any>
  ): MCPServerOptions {
    return {
      ...server,
      metadata: { ...(server.metadata ?? {}), ...metadata },
    };
  }

  async listMCPServerDetails(filters?: Record<string, any>): Promise<MCPServerDetails[]> {
    await this.waitForMCPServersInitialization();
    const allConnections = Array.from(this.connectionManager.listConnections().values());

    const detailedServers = allConnections.map(conn => conn.getDetails());

    if (!filters || Object.keys(filters).length === 0) {
      return detailedServers;
    }

    // Apply filtering based on metadata
    return detailedServers.filter(details => {
        const metadata = details.metadata ?? {};
        return Object.entries(filters).every(([key, value]) => metadata[key] === value);
    });
  }

  async validateMCPSettings(mcpSettings: MCPSettings): Promise<MCPServerDetails[]> {
     // Delegate validation to the connection manager
     return this.connectionManager.validateMCPSettings(mcpSettings.mcpServers);
  }
}
