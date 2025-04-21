import { ChatAnthropic } from "@langchain/anthropic";
import { LLMConfig, LLMError, ModelInfo } from "../llm-types";
import { LangChainModelProvider } from "./base";

enum AnthropicModel {
  CLAUDE_3_5_SONNET_20241022 = "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU_20241022 = "claude-3-5-haiku-20241022",
  CLAUDE_3_5_OPUS_20240229 = "claude-3-opus-20240229",
  CLAUDE_3_5_HAIKU_20240307 = "claude-3-haiku-20240307",
}

interface AnthropicModelInfo {
  id: string;
  maxTokens: number;
}

const MODEL_CONFIGS: Record<AnthropicModel, AnthropicModelInfo> = {
  [AnthropicModel.CLAUDE_3_5_SONNET_20241022]: {
    id: AnthropicModel.CLAUDE_3_5_SONNET_20241022,
    maxTokens: 8192,
  },
  [AnthropicModel.CLAUDE_3_5_HAIKU_20241022]: {
    id: AnthropicModel.CLAUDE_3_5_HAIKU_20241022,
    maxTokens: 8192,
  },
  [AnthropicModel.CLAUDE_3_5_OPUS_20240229]: {
    id: AnthropicModel.CLAUDE_3_5_OPUS_20240229,
    maxTokens: 4096,
  },
  [AnthropicModel.CLAUDE_3_5_HAIKU_20240307]: {
    id: AnthropicModel.CLAUDE_3_5_HAIKU_20240307,
    maxTokens: 4096,
  },
};

interface AnthropicConfig extends LLMConfig {
  baseUrl?: string;
  apiKey: string;
  model: AnthropicModel;
  maxRetries?: number;
}

export class AnthropicLangChainProvider implements LangChainModelProvider {
  private defaultModel = AnthropicModel.CLAUDE_3_5_SONNET_20241022;
  protected configData: AnthropicConfig;
  private model: ChatAnthropic;

  constructor(config: Partial<AnthropicConfig>) {
    this.configData = this.getConfig(config);
    const modelInfo = MODEL_CONFIGS[this.configData.model];
    this.model = new ChatAnthropic({
      anthropicApiKey: this.configData.apiKey,
      modelName: modelInfo.id,
      maxTokens: modelInfo.maxTokens,
      maxRetries: this.configData.maxRetries,
      anthropicApiUrl: this.configData.baseUrl,
    });
  }

  getConfig(config: Partial<AnthropicConfig>): AnthropicConfig {
    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new LLMError("Anthropic API key is required", "anthropic");
    }

    const model = config.model || this.defaultModel;
    if (!Object.values(AnthropicModel).includes(model)) {
      throw new LLMError(`Invalid model ID: ${model}`, "anthropic");
    }

    return {
      baseUrl:
        config.baseUrl ||
        "https://api.anthropic.com" ||
        process.env.ANTHROPIC_BASE_URL,
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || "",
      model: model,
      maxRetries: config.maxRetries || 3,
    };
  }

  getModel(): ChatAnthropic {
    return this.model;
  }

  getModelInfo(): ModelInfo {
    const modelInfo = MODEL_CONFIGS[this.configData.model];
    return {
      id: modelInfo.id,
      provider: "anthropic",
      maxTokens: modelInfo.maxTokens,
    };
  }

  isValid(): boolean {
    try {
      if (!this.configData.apiKey) return false;
      const modelInfo = MODEL_CONFIGS[this.configData.model];
      return Boolean(modelInfo);
    } catch (error) {
      return false;
    }
  }
}

export default AnthropicLangChainProvider;
