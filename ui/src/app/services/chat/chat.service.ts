import { Injectable } from '@angular/core';
import {
  suggestionPayload,
  conversePayload,
  ChatUpdateRequirementResponse,
} from '../../model/interfaces/chat.interface';
import { CHAT_TYPES } from '../../constants/app.constants';
import { ElectronService } from '../../electron-bridge/electron.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor(private electronService: ElectronService) {}

  generateSuggestions(request: suggestionPayload): Promise<Array<''>> {
    return this.electronService.getSuggestions(request);
  }

  chatWithLLM(
    type: string,
    request: conversePayload,
  ): Promise<ChatUpdateRequirementResponse> {
    if (type === CHAT_TYPES.REQUIREMENT) {
      return this.electronService.chatUpdateRequirement(request);
    } else {
      return this.electronService.chatUserStoryTask(request);
    }
  }

  async addSpecifAIConfigToProject(projectId: string): Promise<boolean> {
    try {
      const response =
        await this.electronService.getProjectMCPSettings(projectId);

      if (!response.success) {
        return false;
      }

      const settings = response.settings || { mcpServers: {} };
      const SPECIFAI_MCP_CONFIG = {
        command: 'npx',
        args: ['--yes', '@presidio-dev/specifai-mcp-server@latest'],
        disabled: false,
        transportType: 'stdio' as const,
        metadata: {} as Record<string, string>,
        env: {} as Record<string, string>,
      };

      const updatedSettings = {
        ...settings,
        mcpServers: {
          ...settings.mcpServers,
          specifai: SPECIFAI_MCP_CONFIG,
        },
      };

      // Update settings
      const updateResponse =
        await this.electronService.updateProjectMCPSettings(
          projectId,
          updatedSettings,
        );
      return updateResponse.success;
    } catch (error) {
      console.error('Error adding SPECIFAI_MCP_CONFIG to project:', error);
      return false;
    }
  }
}
