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
  MCPResource,
  MCPServerOptions,
  MCPTool,
} from "./types";

const DEFAULT_MCP_TIMEOUT = 20_000; // 20 seconds

export class MCPConnection {
  public client: Client;
  private transport: Transport | null = null;

  private connectionPromise: Promise<unknown> | null = null;
  public abortController: AbortController;

  public status: MCPConnectionStatus = "not-connected";
  public errors: string[] = [];

  public tools: MCPTool[] = [];
  public resources: MCPResource[] = [];

  private _metadata: Record<string, any>;

  constructor(
    private readonly id: string,
    private readonly options: MCPServerOptions,
    metadata: Record<string, any> = {}
  ) {
    this.client = new Client({
      name: "specifai-client",
      version: "0.1",
    });

    this.abortController = new AbortController();
    this._metadata = metadata;
  }

  private async constructTransport(options: MCPServerOptions): Promise<Transport> {
    switch (options.transportType) {
      case "stdio":
        const env: Record<string, string> = options.env || {};
        // @ts-expect-error shell-path has no type definitions
        // https://github.com/sindresorhus/file-type/issues/535#issuecomment-1065952695
        const { shellPath } = await (eval('import("shell-path")') as Promise<typeof import('shell-path')>);
        const defaultShellPath = await shellPath();
        // https://github.com/electron/electron/issues/5626
        // > This is unfortunately a behavior of OS X, every app started from Finder does not get the environment variables from terminal
        if (defaultShellPath !== undefined) {
          env.PATH = defaultShellPath;
        }
        return new StdioClientTransport({
          command: options.command,
          args: options.args,
          env,
        });
      case "websocket":
        return new WebSocketClientTransport(new URL(options.url));
      case "sse":
        return new SSEClientTransport(new URL(options.url));
      default:
        throw new Error(
          `Unsupported transport type: ${(options as any).transportType}`
        );
    }
  }

  get metadata() {
    return this._metadata;
  }

  setMetadata(metadata: Record<string, string> = {}) {
    this._metadata = metadata;
  }

  get disabled() {
    return this.options.disabled;
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
        metadata: {
          resource: {
            name: resource.name,
            uri: resource.uri,
          },
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
          DEFAULT_MCP_TIMEOUT
        );

        try {
          await Promise.race([
            new Promise((_, reject) => {
              timeoutController.signal.addEventListener("abort", () => {
                reject(new Error("Connection timed out"));
              });
            }),
            (async () => {
              this.transport = await this.constructTransport(this.options);
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
          let errorMessage = `Failed to connect to MCP server ${this.id}`;
          if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (msg.includes("spawn") && msg.includes("enoent")) {
              const command = msg.split(" ")[1];
              errorMessage += ` command "${command}" not found. To use this MCP server, install the ${command} CLI.`;
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

  getDetails() {
    return {
      ...this.options,
      id: this.id,
      name: this.options.name,
      status: this.status,
      resources: this.resources,
      tools: this.tools,
      errors: this.errors,
    };
  }

  hasOptionsChanged(newOptions: MCPServerOptions): boolean {
    return JSON.stringify(this.options) !== JSON.stringify(newOptions);
  }
}
