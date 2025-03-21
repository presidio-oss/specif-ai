import OpenAI, { AzureOpenAI } from "openai";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";
import { withRetry } from "../../../utils/retry";

interface OpenAIConfig extends LLMConfig {
  baseUrl?: string;
  apiKey?: string;
  azureApiKey?: string;
  apiVersion?: string;
  modelId: string;
  maxRetries?: number;
}

export class OpenAIHandler extends LLMHandler {
  private client: OpenAI | AzureOpenAI;
  protected configData: OpenAIConfig;

  constructor(config: Partial<OpenAIConfig>) {
    super();
    this.configData = this.getConfig(config);

    // Create appropriate client based on base URL
    if (this.configData.baseUrl?.toLowerCase().includes('azure.com')) {
      if (!this.configData.azureApiKey) {
        throw new LLMError("Azure OpenAI API key is required for Azure endpoints", "openai");
      }
      // if (!this.configData.apiVersion) {
      //   throw new LLMError("API version is required for Azure endpoints", "openai");
      // }
      this.client = new AzureOpenAI({
        apiKey: this.configData.azureApiKey,
        endpoint: this.configData.baseUrl,
        deployment: this.configData.modelId,
        apiVersion: "2024-09-01-preview",
        maxRetries: this.configData.maxRetries || 3
      });
    } else {
      if (!this.configData.apiKey) {
        throw new LLMError("OpenAI API key is required", "openai");
      }
      this.client = new OpenAI({
        apiKey: this.configData.apiKey,
        baseURL: this.configData.baseUrl,
        maxRetries: this.configData.maxRetries || 3
      });
    }
  }

  getConfig(config: Partial<OpenAIConfig>): OpenAIConfig {
    if (!config.modelId) {
      throw new LLMError("Model ID is required", "openai");
    }

    return {
      baseUrl: config.baseUrl || process.env.OPENAI_BASE_URL,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      azureApiKey: config.azureApiKey || process.env.AZURE_OPENAI_API_KEY,
      apiVersion: "2024-09-01-preview",
      modelId: config.modelId.toLowerCase(),
      maxRetries: config.maxRetries || 3
    };
  }

  @withRetry({ retryAllErrors: true })
  async invoke(messages: Message[], systemPrompt: string | null = null): Promise<string> {
    const messageList = [...messages];
    if (systemPrompt) {
      messageList.unshift({ role: "system", content: systemPrompt });
    }

    // Convert messages to OpenAI's expected format
    const openAIMessages = messageList.map(msg => {
      const baseMsg = {
        role: msg.role as any,
        content: msg.content
      };
      return msg.name ? { ...baseMsg, name: msg.name } : baseMsg;
    });

    const response = await this.client.chat.completions.create({
      model: this.getModel().id,
      messages: openAIMessages,
      stream: false
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new LLMError("No response content received from OpenAI API", "openai");
    }

    return response.choices[0].message.content;
  }

  getModel(): ModelInfo {
    return {
      id: this.configData.modelId,
      provider: 'openai'
    };
  }

  isValid(): boolean {
    try {
      const modelInfo = this.getModel();
      if (!modelInfo.id) return false;

      if (this.configData.baseUrl?.toLowerCase().includes('azure.com')) {
        return Boolean(this.configData.azureApiKey && this.configData.apiVersion);
      }
      return Boolean(this.configData.apiKey);
    } catch (error) {
      return false;
    }
  }
}

export default OpenAIHandler;
