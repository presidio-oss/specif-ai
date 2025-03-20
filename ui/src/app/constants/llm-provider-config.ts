export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'checkbox';
  label: string;
  required?: boolean;
  defaultValue?: any;
}

export interface ProviderConfig {
  fields: ProviderField[];
}

export const LLM_PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  'openai': { // Azure OpenAI
    fields: [
      { name: 'endpoint', type: 'text', label: 'Base URL', required: true },
      { name: 'apiKey', type: 'password', label: 'API Key', required: true },
      { name: 'deploymentId', type: 'text', label: 'Deployment ID', required: true },
      { name: 'apiVersion', type: 'text', label: 'API Version', required: true }
    ]
  },
  'openai-native': {
    fields: [
      { name: 'apiKey', type: 'password', label: 'API Key', required: true },
      { name: 'model', type: 'text', label: 'Model', required: true }
    ]
  },
  'bedrock': {
    fields: [      
      { name: 'model', type: 'text', label: 'Model', required: true },
      { name: 'accessKeyId', type: 'text', label: 'Access Key ID', required: true },
      { name: 'secretAccessKey', type: 'password', label: 'Secret Access Key', required: true },
      { name: 'sessionToken', type: 'password', label: 'Session Token' },
      { name: 'region', type: 'text', label: 'Region', required: true },
      { name: 'crossRegion', type: 'checkbox', label: 'Enable Cross Region', defaultValue: false },
    ]
  },
  'gemini': {
    fields: [
      { name: 'apiKey', type: 'password', label: 'API Key', required: true },
      { name: 'model', type: 'text', label: 'Model', required: true }
    ]
  },
  'anthropic': {
    fields: [
      { name: 'apiKey', type: 'password', label: 'API Key', required: true },
      { name: 'baseUrl', type: 'text', label: 'Base URL (Optional)' },
      { name: 'maxRetries', type: 'number', label: 'Max Retries', defaultValue: 3 },
      { name: 'model', type: 'text', label: 'Model', required: true }
    ]
  }
};
