import Anthropic from "@anthropic-ai/sdk";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";
import { withRetry } from "../../../utils/retry";

enum AnthropicModel {
  CLAUDE_3_5_SONNET_20241022 = 'claude-3-5-sonnet-20241022',
  CLAUDE_3_5_HAIKU_20241022 = 'claude-3-5-haiku-20241022',
  CLAUDE_3_5_OPUS_20240229 = 'claude-3-opus-20240229',
  CLAUDE_3_5_HAIKU_20240307 = 'claude-3-haiku-20240307'
}

interface AnthropicModelInfo {
  id: string;
  maxTokens: number;
}

const MODEL_CONFIGS: Record<AnthropicModel, AnthropicModelInfo> = {
  [AnthropicModel.CLAUDE_3_5_SONNET_20241022]: { id: AnthropicModel.CLAUDE_3_5_SONNET_20241022, maxTokens: 8192 },
  [AnthropicModel.CLAUDE_3_5_HAIKU_20241022]: { id: AnthropicModel.CLAUDE_3_5_HAIKU_20241022, maxTokens: 8192 },
  [AnthropicModel.CLAUDE_3_5_OPUS_20240229]: { id: AnthropicModel.CLAUDE_3_5_OPUS_20240229, maxTokens: 4096 },
  [AnthropicModel.CLAUDE_3_5_HAIKU_20240307]: { id: AnthropicModel.CLAUDE_3_5_HAIKU_20240307, maxTokens: 4096 }
};

interface AnthropicConfig extends LLMConfig {
  baseUrl?: string;
  apiKey: string;
  model: AnthropicModel;
  maxRetries?: number;
}

export class AnthropicHandler extends LLMHandler {
  private client: Anthropic;
  protected configData: AnthropicConfig;
  private defaultModel = AnthropicModel.CLAUDE_3_5_SONNET_20241022;

  constructor(config: Partial<AnthropicConfig>) {
    super();
    this.configData = this.getConfig(config);

    this.client = new Anthropic({
      apiKey: this.configData.apiKey,
      baseURL: this.configData.baseUrl,
      maxRetries: this.configData.maxRetries || 3
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
      baseUrl: config.baseUrl || process.env.ANTHROPIC_BASE_URL,
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      model: model,
      maxRetries: config.maxRetries || 3
    };
  }

  @withRetry({ retryAllErrors: true })
  async invoke(messages: Message[], systemPrompt: string | null = null): Promise<string> {
    const modelInfo = MODEL_CONFIGS[this.configData.model];

    // Convert messages to Anthropic's format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: [{
        type: 'text' as const,
        text: msg.content
      }]
    }));

    const response = await this.client.messages.create({
      model: modelInfo.id,
      max_tokens: modelInfo.maxTokens,
      messages: anthropicMessages,
      ...(systemPrompt && { system: systemPrompt })
    });

    const content = response.content?.[0];
    if (!content || content.type !== 'text' || !('text' in content)) {
      throw new LLMError("No valid text content received from Anthropic API", "anthropic");
    }

    return content.text;
  }

  getModel(): ModelInfo {
    const modelInfo = MODEL_CONFIGS[this.configData.model];
    return {
      id: modelInfo.id,
      provider: 'anthropic',
      maxTokens: modelInfo.maxTokens
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

export default AnthropicHandler;
