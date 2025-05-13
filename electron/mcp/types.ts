import { z } from "zod";
import {
  McpServerOptionsSchema,
  McpSettingsSchema,
} from "./schema";

export type MCPServerOptions = z.infer<typeof McpServerOptionsSchema>;
export type MCPSettings = z.infer<typeof McpSettingsSchema>;

export type MCPConnectionStatus =
  | "connecting"
  | "connected"
  | "error"
  | "not-connected";

export interface MCPResource {
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, any>;
  };
}

export type MCPServerDetails = MCPServerOptions & {
  id: string;
  status: MCPConnectionStatus;
  errors: string[];
  tools: MCPTool[];
  resources: MCPResource[];
};
