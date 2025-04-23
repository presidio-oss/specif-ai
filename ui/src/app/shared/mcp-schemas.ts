import { z } from "zod";

// Schema for StdioOptions
const StdioOptionsSchema = z.object({
  transportType: z.literal("stdio"),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()).default({}),
});

// Schema for WebSocketOptions
const WebSocketOptionsSchema = z.object({
  transportType: z.literal("websocket"),
  url: z.string().url(),
});

// Schema for SSEOptions
const SseOptionsSchema = z.object({
  transportType: z.literal("sse"),
  url: z.string().url(),
});

// Schema for MCPServerOptions
export const McpServerOptionsSchema = z.object({
  disabled: z.boolean().default(false),
  timeout: z.number().positive().optional(),
  name: z.string().optional(),
  metadata: z.record(z.string()).default({})
}).and(
  z.discriminatedUnion("transportType", [
    StdioOptionsSchema,
    WebSocketOptionsSchema,
    SseOptionsSchema,
  ])
);

// Schema for MCPServers
export const McpServersSchema = z.record(McpServerOptionsSchema);

export const McpSettingsSchema = z.object({
  mcpServers: McpServersSchema,
});
