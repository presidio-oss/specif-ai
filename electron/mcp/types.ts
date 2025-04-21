import { z } from "zod";
import {
  McpOptionsSchema,
  McpSettingsSchema,
  SseOptionsSchema,
  StdioOptionsSchema,
  TransportOptionsSchema,
  WebSocketOptionsSchema,
} from "./schema";

export type StdioOptions = z.infer<typeof StdioOptionsSchema>;
export type WebSocketOptions = z.infer<typeof WebSocketOptionsSchema>;
export type SSEOptions = z.infer<typeof SseOptionsSchema>;
export type TransportOptions = z.infer<typeof TransportOptionsSchema>;
export type MCPOptions = z.infer<typeof McpOptionsSchema>;
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

export interface MCPServerStatus extends MCPOptions {
  status: MCPConnectionStatus;
  errors: string[];
  tools: MCPTool[];
  resources: MCPResource[];
}
