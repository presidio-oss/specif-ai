export interface Message {
  role: string;
  content: string;
}

export interface ModelInfo {
  id: string;
  provider: string;
  maxTokens?: number;
}

export interface LLMConfig {
  [key: string]: any;
}

export interface LLMConfigModel {
  provider: string;
  model: string;
  config: {
    // Common fields
    apiKey?: string;

    // Azure OpenAI fields
    endpoint?: string;
    deploymentId?: string;

    // Bedrock fields
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;
    crossRegion?: boolean;

    // Anthropic fields
    baseUrl?: string;
    maxRetries?: number;
  };
}

export class LLMError extends Error {
  constructor(message: string, public provider: string) {
    super(message);
    this.name = 'LLMError';
  }
}
