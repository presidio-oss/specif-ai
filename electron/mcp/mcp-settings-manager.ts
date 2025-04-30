import fs from "node:fs/promises";
import path from "node:path";
import { FILE_NAME } from "../constants/app.constants";
import { ensureSettingsDirectoryExists } from "../utils/file";
import { McpSettingsSchema } from "./schema";
import { MCPSettings } from "./types";

export class MCPSettingsManager {
  private getSettingsDirectoryPath: () => Promise<string>;

  private static instance: MCPSettingsManager | null = null;

  private constructor() {
    this.getSettingsDirectoryPath = ensureSettingsDirectoryExists;
  }

  static getInstance() {
    if (this.instance == null) {
      return new MCPSettingsManager();
    }

    return this.instance;
  }

  async getProjectMCPSettingsFilePath(projectId: string): Promise<string> {
    const settingsFolderPath = await this.getSettingsDirectoryPath();
    return path.join(
      settingsFolderPath,
      FILE_NAME.PROJECT_MCP_SETTINGS(projectId)
    );
  }

  async getGlobalMCPSettingsFilePath(): Promise<string> {
    const settingsFolderPath = await this.getSettingsDirectoryPath();
    return path.join(settingsFolderPath, FILE_NAME.GLOBAL_MCP_SETTINGS);
  }

  async readProjectMCPSettings(projectId: string | null): Promise<MCPSettings> {
    if (!projectId) {
      return { mcpServers: {} };
    }
    const projectMCPSettingsPath = await this.getProjectMCPSettingsFilePath(
      projectId
    );
    return this.readMCPSettings(projectMCPSettingsPath);
  }

  async readGlobalMCPSettings(): Promise<MCPSettings> {
    const globalMCPSettingsPath = await this.getGlobalMCPSettingsFilePath();
    return this.readMCPSettings(globalMCPSettingsPath);
  }

  private async readMCPSettings(mcpSettingsPath: string): Promise<MCPSettings> {
    try {
      const mcpSettingsStringified = await fs.readFile(
        mcpSettingsPath,
        "utf-8"
      );
      return McpSettingsSchema.parse(JSON.parse(mcpSettingsStringified));
    } catch (error) {
      console.warn(`Error reading mcp settings file ${error}`);
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        console.log(`MCP settings file not found, returning empty settings`);
      }
      return { mcpServers: {} };
    }
  }

  async writeGlobalMCPSettings(mcpSettings: MCPSettings): Promise<void> {
    const globalMCPSettingsPath = await this.getGlobalMCPSettingsFilePath();
    await this.writeMCPSettings(globalMCPSettingsPath, mcpSettings);
  }

  async writeProjectMCPSettings(
    projectId: string,
    mcpSettings: MCPSettings
  ): Promise<void> {
    const projectMCPSettingsPath = await this.getProjectMCPSettingsFilePath(
      projectId
    );
    await this.writeMCPSettings(projectMCPSettingsPath, mcpSettings);
  }

  private async writeMCPSettings(
    mcpSettingsPath: string,
    mcpSettings: MCPSettings
  ): Promise<void> {
    try {
      const validatedSettings = McpSettingsSchema.parse(mcpSettings);
      const mcpSettingsStringified = JSON.stringify(validatedSettings, null, 2);
      await fs.writeFile(mcpSettingsPath, mcpSettingsStringified, "utf-8");
      console.log(`MCP settings written successfully to ${mcpSettingsPath}`);
    } catch (error) {
      console.error(
        `Error validating or writing MCP settings to ${mcpSettingsPath}:`,
        error
      );
      throw error;
    }
  }
}
