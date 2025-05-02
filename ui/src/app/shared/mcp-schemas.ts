import { z } from "zod";

// Schema for StdioOptions
const StdioOptionsSchema = z.object({
  transportType: z.literal("stdio").default("stdio"),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()).default({}),
});

// Schema for WebSocketOptions
const WebSocketOptionsSchema = z.object({
  transportType: z.literal("websocket").default("websocket"),
  url: z.string().url(),
});

// Schema for SSEOptions
const SseOptionsSchema = z.object({
  transportType: z.literal("sse").default("sse"),
  url: z.string().url(),
});

const BaseServerOptionsSchema = z.object({
  disabled: z.boolean().default(false),
  name: z.string().optional(),
  metadata: z.record(z.string()).optional().default({}),
});

export const StdioServerOptionsSchema = BaseServerOptionsSchema.merge(StdioOptionsSchema);
export const WebSocketServerOptionsSchema = BaseServerOptionsSchema.merge(WebSocketOptionsSchema);
export const SseServerOptionsSchema = BaseServerOptionsSchema.merge(SseOptionsSchema);

// Schema for MCPServerOptions
export const McpServerOptionsSchema = z.union([StdioServerOptionsSchema, WebSocketServerOptionsSchema, SseServerOptionsSchema]);

// Schema for MCPServers
export const McpServersSchema = z.record(McpServerOptionsSchema);

export const McpSettingsSchema = z.object({
  mcpServers: McpServersSchema,
});
