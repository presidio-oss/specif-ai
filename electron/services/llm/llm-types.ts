export enum LLMProvider {
  OPENAI = 'openai',
  OPENAI_NATIVE = 'openai-native',
  ANTHROPIC = 'anthropic',
  BEDROCK = 'bedrock',
  OLLAMA = 'ollama',
  GEMINI = 'gemini',
}

export interface Message {
  role: string;
  content: string;
  name?: string;
  [key: string]: any;
}

export interface ModelInfo {
  id: string;
  provider?: string;
  endpoint?: string;
  [key: string]: any;
}

export interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  modelId?: string;
  maxRetries?: number;
  [key: string]: any;
}

// Error class for LLM-related errors 
export class LLMError extends Error {
  constructor(message: string, public readonly provider: string) {
    super(message);
    this.name = 'LLMError';
  }
}
