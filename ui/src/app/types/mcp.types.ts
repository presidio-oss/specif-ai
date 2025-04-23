import { z } from 'zod';
import {
  McpServerOptionsSchema,
  McpSettingsSchema,
} from '../shared/mcp-schemas';

export type MCPSettings = z.infer<typeof McpSettingsSchema>;
export type MCPServerOptions = z.infer<typeof McpServerOptionsSchema>;

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPResource {
  name: string;
  uri: string;
  description: string;
}

export type MCPServerDetails = MCPServerOptions & {
  id: string;
  status: 'connected' | 'error';
  errors?: string[];
  tools: MCPTool[];
  resources: MCPResource[];
};

export type ValidateMCPServersResponse = MCPServerDetails[];
