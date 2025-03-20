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
