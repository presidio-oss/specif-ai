export enum LLMProvider {
  OPENAI = 'openai',
  OPENAI_NATIVE = 'openai-native',
  ANTHROPIC = 'anthropic',
  BEDROCK = 'bedrock',
  OLLAMA = 'ollama',
  GEMINI = 'gemini',
  OPENROUTER = 'openrouter',
}

export interface Message {
  role: string;
  content: string;
  name?: string;
}

export interface ModelInfo {
  id: string;
  provider: string;
  maxTokens?: number;
}

export interface LLMConfig {
  [key: string]: any;
}

export interface ProviderConfig {
  config: {
    // Common fields
    apiKey?: string;

    // Azure OpenAI fields
    endpoint?: string;
    deployment?: string;

    // Bedrock fields
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;
    crossRegion?: boolean;

    // Anthropic fields
    baseUrl?: string;
    maxRetries?: number;

    // Model field (provider specific)
    model?: string;
  };
}

export interface LLMConfigModel {
  activeProvider: string;
  providerConfigs: {
    [provider: string]: ProviderConfig;
  };
  isDefault: boolean;
}

export class LLMError extends Error {
  constructor(message: string, public provider: string) {
    super(message);
    this.name = 'LLMError';
  }
}
