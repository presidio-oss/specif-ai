export const SPECIFAI_MCP_CONFIG = {
  command: "npx",
  args: ["--yes", "@presidio-dev/specifai-mcp-server@latest"],
  disabled: false,
  transportType: "stdio" as const,
  metadata: {} as Record<string, string>,
  env: {} as Record<string, string>
};
