export interface LLMConfigModel {
  provider: string;
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

    // Model field (provider specific)
    model?: string;
  };
}
