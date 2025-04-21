import { z } from "zod";

// Schema for StdioOptions
export const StdioOptionsSchema = z.object({
  type: z.literal("stdio"),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
});

// Schema for WebSocketOptions
export const WebSocketOptionsSchema = z.object({
  type: z.literal("websocket"),
  url: z.string().url(),
});

// Schema for SSEOptions
export const SseOptionsSchema = z.object({
  type: z.literal("sse"),
  url: z.string().url(),
});

// Schema for TransportOptions (union)
export const TransportOptionsSchema = z.discriminatedUnion("type", [
  StdioOptionsSchema,
  WebSocketOptionsSchema,
  SseOptionsSchema,
]);

// Schema for MCPOptions
export const McpOptionsSchema = z.object({
  name: z.string(),
  id: z.string(),
  transport: TransportOptionsSchema,
  faviconUrl: z.string().url().optional(),
  timeout: z.number().positive().optional(),
});

// Schema for array of MCP servers from settings file
export const McpServersSchema = z.array(McpOptionsSchema);

export const McpSettingsSchema = z.object({
  servers: McpServersSchema,
});
