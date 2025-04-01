import { OpenAI } from 'openai';
import LLMHandler from '../llm-handler';
import { Message, ModelInfo, LLMConfig, LLMError } from '../llm-types';
import { withRetry } from '../../../utils/retry';
import { ObservabilityManager } from "../../observability/observability.manager";
import { TRACES } from "../../../helper/constants";

interface OpenRouterConfig extends LLMConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export class OpenRouterHandler extends LLMHandler {
  private client: OpenAI;
  protected configData: OpenRouterConfig;
  private defaultBaseUrl: string = 'https://openrouter.ai/api/v1'
  private observabilityManager = ObservabilityManager.getInstance();

  constructor(config: Partial<OpenRouterConfig>) {
    super();
    this.configData = this.getConfig(config);

    this.client = new OpenAI({
      apiKey: this.configData.apiKey,
      baseURL: this.configData.baseUrl || this.defaultBaseUrl,
    });
  }

  getConfig(config: Partial<OpenRouterConfig>): OpenRouterConfig {
    if (!config.apiKey) {
      throw new LLMError('OpenRouter API key is required', 'openrouter');
    }
    if (!config.model) {
      throw new LLMError('OpenRouter model is required', 'openrouter');
    }

    return {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl || this.defaultBaseUrl
    };
  }

  @withRetry({ retryAllErrors: true })
  async invoke(
    messages: Message[],
    systemPrompt: string | null = null,
    operation: string = "llm:invoke"
  ): Promise<string> {
    const messageList = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : [...messages];

    const openAIMessages = messageList.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
    })) as any[];

    const response = await this.client.chat.completions.create({
      model: this.configData.model,
      messages: openAIMessages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const trace = this.observabilityManager.createTrace(TRACES.CHAT_OPENROUTER);
    
    trace.generation({
      name: operation,
      model: this.configData.model,
      usage: {
        input: response.usage?.prompt_tokens,
        output: response.usage?.completion_tokens,
        total: response.usage?.total_tokens
      }
    });
    
    if (!response.choices?.[0]?.message?.content) {
      throw new LLMError(
        'No response content received from OpenRouter API',
        'openrouter'
      );
    }

    return response.choices[0].message.content;
  }

  getModel(): ModelInfo {
    return {
      id: this.configData.model,
      provider: 'openrouter',
    };
  }

  isValid(): boolean {
    try {
      return Boolean(this.configData.apiKey && this.configData.model);
    } catch (error) {
      return false;
    }
  }
}

export default OpenRouterHandler;
