import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";
import { withRetry } from "../../../utils/retry";

interface OllamaConfig extends LLMConfig {
  baseUrl: string;
  modelId: string;
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  message: {
    content: string;
  };
  error?: string;
}

export class OllamaHandler extends LLMHandler {
  protected configData: OllamaConfig;
  private defaultBaseUrl = 'http://localhost:11434';

  constructor(config: Partial<OllamaConfig>) {
    super();
    this.configData = this.getConfig(config);
  }

  getConfig(config: Partial<OllamaConfig>): OllamaConfig {
    if (!config.modelId) {
      throw new LLMError("Model ID is required", "ollama");
    }

    return {
      baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || this.defaultBaseUrl,
      modelId: config.modelId.toLowerCase()
    };
  }

  @withRetry({ retryAllErrors: true })
  async invoke(messages: Message[], systemPrompt: string | null = null): Promise<string> {
    const messageList: OllamaMessage[] = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messageList.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Convert messages to Ollama format
    messageList.push(...messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    } as OllamaMessage)));

    const response = await fetch(`${this.configData.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.configData.modelId,
        messages: messageList,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      const e = new Error(`HTTP error! status: ${response.status}, message: ${error}`);
      (e as any).status = response.status;
      throw e;
    }

    const data = await response.json() as OllamaResponse;
    
    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.message?.content) {
      throw new LLMError("No response content received from Ollama API", "ollama");
    }

    return data.message.content;
  }

  getModel(): ModelInfo {
    return {
      id: this.configData.modelId,
      provider: 'ollama'
    };
  }

  async isValid(): Promise<boolean> {
    try {
      const response = await fetch(`${this.configData.baseUrl}/api/tags`);
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return Array.isArray(data.models) && 
        data.models.some((model: any) => model.name === this.configData.modelId);
    } catch (error) {
      return false;
    }
  }
}

export default OllamaHandler;
