import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";
import { withRetry } from "../../../utils/retry";
import { ObservabilityManager } from "../../observability/observability.manager";
import { TRACES } from "../../../helper/constants";

interface BedrockConfig extends LLMConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  model: string;
  useCrossRegionInference?: boolean;
}

export class BedrockHandler extends LLMHandler {
  private client: BedrockRuntimeClient;
  protected configData: BedrockConfig;
  private observabilityManager = ObservabilityManager.getInstance();

  constructor(config: Partial<BedrockConfig>) {
    super();
    this.configData = this.getConfig(config);

    const credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    } = {
      accessKeyId: this.configData.accessKeyId,
      secretAccessKey: this.configData.secretAccessKey,
    };

    if (this.configData.sessionToken) {
      credentials.sessionToken = this.configData.sessionToken;
    }

    this.client = new BedrockRuntimeClient({
      region: this.configData.region,
      credentials,
    });
  }

  getConfig(config: Partial<BedrockConfig>): BedrockConfig {
    if (!config.region) {
      throw new LLMError("AWS region is required", "bedrock");
    }
    if (!config.accessKeyId) {
      throw new LLMError("AWS access key ID is required", "bedrock");
    }
    if (!config.secretAccessKey) {
      throw new LLMError("AWS secret access key is required", "bedrock");
    }
    if (!config.model) {
      throw new LLMError("Model ID is required", "bedrock");
    }

    return {
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken,
      model: config.model,
      useCrossRegionInference: config.useCrossRegionInference,
    };
  }

  @withRetry({ retryAllErrors: true })
  async invoke(
    messages: Message[],
    systemPrompt: string | null = null,
    operation: string = "llm:invoke"
  ): Promise<string> {
    const messageList = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : [...messages];

    // Format request body based on model provider
    let requestBody;
    if (this.configData.model.includes("anthropic")) {
      requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4096,
        messages: messageList.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: [{ type: "text", text: msg.content }],
        })),
        ...(systemPrompt && { system: systemPrompt }),
      };
    } else {
      // Default to OpenAI-compatible format
      requestBody = {
        messages: messageList.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };
    }

    const modelId = this.getModelId();
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(requestBody),
    });

    const response = await this.client.send(command);

    // Parse response based on model provider
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const totalTokens = responseBody?.usage?.output_tokens + responseBody?.usage?.input_tokens;

    const traceName = `${TRACES.CHAT_BEDROCK_CONVERSE}:${this.configData.model}`;
    const trace = this.observabilityManager.createTrace(traceName);

    // test trace pricing
    trace.generation({
      name: operation,
      model: this.configData.model,
      usage: {
        input: responseBody?.usage?.input_tokens,
        output: responseBody?.usage?.output_tokens,
        total: totalTokens
      },
    });

    if (this.configData.model.includes("anthropic")) {
      if (!responseBody.content?.[0]?.text) {
        throw new LLMError(
          "No response content received from Bedrock Anthropic model",
          "bedrock"
        );
      }
      return responseBody.content[0].text;
    } else {
      // Default to OpenAI-compatible format
      if (!responseBody.choices?.[0]?.message?.content) {
        throw new LLMError(
          "No response content received from Bedrock",
          "bedrock"
        );
      }
      return responseBody.choices[0].message.content;
    }
  }

  /**
   * Gets the appropriate model ID, accounting for cross-region inference if enabled
   */
  private getModelId(): string {
    if (this.configData.useCrossRegionInference) {
      const regionPrefix = this.configData.region.slice(0, 3);

      switch (regionPrefix) {
        case "us-":
          return `us.${this.getModel().id}`;
        case "eu-":
          return `eu.${this.getModel().id}`;
        case "ap-":
          return `apac.${this.getModel().id}`;
        default:
          // cross region inference is not supported in this region, falling back to default model
          return this.getModel().id;
      }
    }
    return this.getModel().id;
  }

  getModel(): ModelInfo {
    return {
      id: this.configData.model,
      provider: "bedrock",
    };
  }

  isValid(): boolean {
    try {
      return Boolean(
        this.configData.region &&
          this.configData.accessKeyId &&
          this.configData.secretAccessKey &&
          this.configData.model
      );
    } catch (error) {
      return false;
    }
  }
}

export default BedrockHandler;
