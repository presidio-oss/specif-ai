import OpenAI, { AzureOpenAI } from "openai";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";
import { withRetry } from "../../../utils/retry";
import { ObservabilityManager } from "../../observability/observability.manager";
import { TRACES } from "../../../helper/constants";

interface OpenAIConfig extends LLMConfig {
  baseUrl?: string;
  apiKey?: string;
  azureApiKey?: string;
  apiVersion?: string;
  model: string;
  maxRetries?: number;
}

export class OpenAIHandler extends LLMHandler {
  private client: OpenAI | AzureOpenAI;
  protected configData: OpenAIConfig;
  private observabilityManager = ObservabilityManager.getInstance();

  constructor(config: Partial<OpenAIConfig>) {
    super();
    this.configData = this.getConfig(config);

    // Create appropriate client based on base URL
    if (this.configData.baseUrl?.toLowerCase().includes("azure.com")) {
      if (!this.configData.azureApiKey) {
        throw new LLMError(
          "Azure OpenAI API key is required for Azure endpoints",
          "openai"
        );
      }
      // if (!this.configData.apiVersion) {
      //   throw new LLMError("API version is required for Azure endpoints", "openai");
      // }
      this.client = new AzureOpenAI({
        apiKey: this.configData.azureApiKey,
        endpoint: this.configData.baseUrl,
        deployment: this.configData.model,
        apiVersion: "2024-09-01-preview",
        maxRetries: this.configData.maxRetries || 3,
      });
    } else {
      if (!this.configData.apiKey) {
        throw new LLMError("OpenAI API key is required", "openai");
      }
      this.client = new OpenAI({
        apiKey: this.configData.apiKey,
        baseURL: this.configData.baseUrl,
        maxRetries: this.configData.maxRetries || 3,
      });
    }
  }

  getConfig(config: Partial<OpenAIConfig>): OpenAIConfig {
    if (!config.model) {
      throw new LLMError("Model ID is required", "openai");
    }

    return {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      azureApiKey: config.azureApiKey,
      apiVersion: "2024-09-01-preview",
      model: config.model.toLowerCase(),
      maxRetries: config.maxRetries || 3,
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
    // Convert messages to OpenAI's expected format
    const openAIMessages = messageList.map((msg) => {
      const baseMsg = {
        role: msg.role as any,
        content: msg.content,
      };
      return msg.name ? { ...baseMsg, name: msg.name } : baseMsg;
    });

    const response = await this.client.chat.completions.create({
      model: this.getModel().id,
      messages: openAIMessages,
      stream: false,
    });

    const traceName = `${TRACES.CHAT_COMPLETION}:${this.configData.model}`;
    const trace = this.observabilityManager.createTrace(traceName);

    trace.generation({
      name: operation,
      model: this.getModel().id,
      usage: {
        input: response.usage?.prompt_tokens,
        output: response.usage?.completion_tokens,
        total: response.usage?.total_tokens
      }
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new LLMError(
        "No response content received from OpenAI API",
        "openai"
      );
    }

    return response.choices[0].message.content;
  }

  getModel(): ModelInfo {
    return {
      id: this.configData.model,
      provider: "openai",
    };
  }

  isValid(): boolean {
    try {
      const modelInfo = this.getModel();
      if (!modelInfo.id) return false;

      if (this.configData.baseUrl?.toLowerCase().includes("azure.com")) {
        return Boolean(
          this.configData.azureApiKey && this.configData.apiVersion
        );
      }
      return Boolean(this.configData.apiKey);
    } catch (error) {
      return false;
    }
  }
}

export default OpenAIHandler;
