import {
  DynamicStructuredTool,
  DynamicStructuredToolInput,
} from "@langchain/core/tools";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { processSchema } from "./schema.utils";
import {
  MCPConnectionStatus,
  MCPOptions,
  MCPResource,
  MCPServerStatus,
  MCPTool,
} from "./types";

const DEFAULT_MCP_TIMEOUT = 20_000; // 10 seconds

export class MCPConnection {
  public client: Client;
  private transport: Transport;

  private connectionPromise: Promise<unknown> | null = null;
  public abortController: AbortController;

  public status: MCPConnectionStatus = "not-connected";
  public errors: string[] = [];

  public tools: MCPTool[] = [];
  public resources: MCPResource[] = [];

  constructor(private readonly options: MCPOptions) {
    this.transport = this.constructTransport(options);

    this.client = new Client({
      name: "specifai-client",
      version: "0.1",
    });

    this.abortController = new AbortController();
  }

  private constructTransport(options: MCPOptions): Transport {
    switch (options.transport.type) {
      case "stdio":
        const env: Record<string, string> = options.transport.env || {};
        if (process.env.PATH !== undefined) {
          env.PATH = process.env.PATH;
        }
        return new StdioClientTransport({
          command: options.transport.command,
          args: options.transport.args,
          env,
        });
      case "websocket":
        return new WebSocketClientTransport(new URL(options.transport.url));
      case "sse":
        return new SSEClientTransport(new URL(options.transport.url));
      default:
        throw new Error(
          `Unsupported transport type: ${(options.transport as any).type}`
        );
    }
  }

  getStatus(): MCPServerStatus {
    return {
      ...this.options,
      errors: this.errors,
      resources: this.resources,
      tools: this.tools,
      status: this.status,
    };
  }

  /**
   * Call an MCP tool and process its result
   */
  private async _callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<[string, any[]]> {
    const result = await this.client.callTool({
      name: toolName,
      arguments: args,
    });

    if (!result) {
      throw new Error(
        `MCP tool '${toolName}' on server '${this.options.name}' returned an invalid result`
      );
    }

    if (result.isError) {
      throw new Error(
        `MCP tool '${toolName}' on server '${
          this.options.name
        }' returned an error: ${JSON.stringify(result.content)}`
      );
    }

    // Ensure content is a string
    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);

    return [content, []];
  }

  /**
   * Convert MCP tools to Langchain tools
   * @returns Array of Langchain tools
   */
  listTools(provider?: string) {
    return this.tools.map((mcpTool) => {
      let inputSchema: any = mcpTool.inputSchema;

      if (provider === "gemini") {
        inputSchema = processSchema(mcpTool.inputSchema);
      }

      console.log(inputSchema, "inputSchema")

      return new DynamicStructuredTool({
        name: `mcp_${mcpTool.name}`,
        description: mcpTool.description || "",
        schema: inputSchema,
        responseFormat: "content_and_artifact",
        func: this._callTool.bind(
          this,
          mcpTool.name
        ) as DynamicStructuredToolInput["func"],
      });
    });
  }

  /**
   * Convert MCP resources to Langchain tools
   * @returns Array of Langchain tools
   */
  listResourcesAsTools() {
    return this.resources.map((resource) => {
      return new DynamicStructuredTool({
        name: `mcp_list_${resource.name}`,
        description:
          resource.description || `List resources of type ${resource.uri}`,
        schema: z.object({
          noOp: z.string().optional().describe("No-op parameter."),
        }),
        responseFormat: "content_and_artifact",
        func: async () => {
          const result = await this.client.readResource({
            uri: resource.uri,
          });

          if (!result) {
            throw new Error(
              `MCP resource '${resource.name}' on server '${this.options.name}' returned an invalid result`
            );
          }

          if (!result.contents || !result.contents.length) {
            throw new Error(
              `MCP resource '${resource.name}' on server '${this.options.name}' returned no content`
            );
          }

          return [result.contents[0].text, []];
        },
      });
    });
  }

  async connectClient(forceRefresh: boolean, externalSignal: AbortSignal) {
    if (!forceRefresh) {
      // Already connected
      if (this.status === "connected") {
        return;
      }

      // Connection is already in progress; wait for it to complete
      if (this.connectionPromise) {
        await this.connectionPromise;
        return;
      }
    }

    this.status = "connecting";
    this.tools = [];
    this.resources = [];
    this.errors = [];

    this.abortController.abort();
    this.abortController = new AbortController();

    this.connectionPromise = Promise.race([
      // If aborted by a refresh or other, cancel and don't do anything
      new Promise((resolve) => {
        externalSignal.addEventListener("abort", () => {
          resolve(undefined);
        });
      }),
      new Promise((resolve) => {
        this.abortController.signal.addEventListener("abort", () => {
          resolve(undefined);
        });
      }),
      (async () => {
        const timeoutController = new AbortController();
        const connectionTimeout = setTimeout(
          () => timeoutController.abort(),
          this.options.timeout ?? DEFAULT_MCP_TIMEOUT
        );

        try {
          await Promise.race([
            new Promise((_, reject) => {
              timeoutController.signal.addEventListener("abort", () => {
                reject(new Error("Connection timed out"));
              });
            }),
            (async () => {
              this.transport = this.constructTransport(this.options);
              try {
                await this.client.connect(this.transport);
              } catch (error) {
                // Allow the case where for whatever reason is already connected
                if (
                  error instanceof Error &&
                  error.message.startsWith(
                    "StdioClientTransport already started"
                  )
                ) {
                  await this.client.close();
                  await this.client.connect(this.transport);
                } else {
                  throw error;
                }
              }

              const capabilities = this.client.getServerCapabilities();

              // Resources <—> Context Provider
              if (capabilities?.resources) {
                try {
                  const { resources } = await this.client.listResources(
                    {},
                    { signal: timeoutController.signal }
                  );
                  this.resources = resources;
                } catch (e) {
                  let errorMessage = `Error loading resources for MCP Server ${this.options.name}`;
                  if (e instanceof Error) {
                    errorMessage += `: ${e.message}`;
                  }
                  this.errors.push(errorMessage);
                }
              }

              // Tools <—> Tools
              if (capabilities?.tools) {
                try {
                  const { tools } = await this.client.listTools(
                    {},
                    { signal: timeoutController.signal }
                  );
                  this.tools = tools;
                } catch (e) {
                  let errorMessage = `Error loading tools for MCP Server ${this.options.name}`;
                  if (e instanceof Error) {
                    errorMessage += `: ${e.message}`;
                  }
                  this.errors.push(errorMessage);
                }
              }

              this.status = "connected";
            })(),
          ]);
        } catch (error) {
          // Otherwise it's a connection error
          let errorMessage = `Failed to connect to MCP server ${this.options.name}`;
          if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (msg.includes("spawn") && msg.includes("enoent")) {
              const command = msg.split(" ")[1];
              errorMessage += `command "${command}" not found. To use this MCP server, install the ${command} CLI.`;
            } else {
              errorMessage += ": " + error.message;
            }
          }

          this.status = "error";
          this.errors.push(errorMessage);
        } finally {
          this.connectionPromise = null;
          clearTimeout(connectionTimeout);
        }
      })(),
    ]);

    await this.connectionPromise;
  }
}
