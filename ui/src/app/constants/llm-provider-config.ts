import { ProviderModelMap } from './llm.models.constants';
export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'checkbox' | 'select';
  label: string;
  required?: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ProviderConfig {
  fields: ProviderField[];
}

const BEDROCK_REGIONS = [
  { value: 'us-east-1', label: 'us-east-1' },
  { value: 'us-west-2', label: 'us-west-2' },
  { value: 'ap-southeast-1', label: 'ap-southeast-1' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1' },
  { value: 'eu-central-1', label: 'eu-central-1' },
];

const getModelOptions = (provider: string) => {
  return (ProviderModelMap[provider] || []).map((model) => ({
    value: model,
    label: model,
  }));
};

export const LLM_PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openrouter: {
    fields: [
      {
        name: 'apiKey',
        type: 'password',
        label: 'API Key',
        required: true,
        placeholder: 'Enter your OpenRouter API key',
      },
      {
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('openrouter'),
      },
      {
        name: 'baseUrl',
        type: 'text',
        label: 'Base URL (Optional)',
        placeholder: 'Base URL',
        defaultValue: 'https://openrouter.ai/api/v1',
      },
    ],
  },
  openai: {
    fields: [
      {
        name: 'endpoint',
        type: 'text',
        label: 'Base URL',
        required: true,
        placeholder: 'https://your-resource.openai.azure.com/',
      },
      {
        name: 'apiKey',
        type: 'password',
        label: 'API Key',
        required: true,
        placeholder: 'Enter your Azure OpenAI API key',
      },
      {
        name: 'deployment',
        type: 'text',
        label: 'Deployment ID',
        required: true,
        placeholder: 'Enter your model deployment name',
      },
      {
        name: 'apiVersion',
        type: 'text',
        label: 'API Version',
        required: true,
        placeholder: 'e.g. 2023-05-15',
        defaultValue: '2024-09-01-preview',
      },
    ],
  },
  'openai-native': {
    fields: [
      {
        name: 'apiKey',
        type: 'password',
        label: 'API Key',
        required: true,
        placeholder: 'Enter your OpenAI API key',
      },
      {
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('openai-native'),
      },
    ],
  },
  bedrock: {
    fields: [
      {
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('bedrock'),
      },
      {
        name: 'accessKeyId',
        type: 'text',
        label: 'Access Key ID',
        required: true,
        placeholder: 'Enter your AWS Access Key ID',
      },
      {
        name: 'secretAccessKey',
        type: 'password',
        label: 'Secret Access Key',
        required: true,
        placeholder: 'Enter your AWS Secret Access Key',
      },
      {
        name: 'sessionToken',
        type: 'password',
        label: 'Session Token',
        placeholder: 'Enter your AWS Session Token (optional)',
      },
      {
        name: 'region',
        type: 'select',
        label: 'Region',
        required: true,
        options: BEDROCK_REGIONS,
      },
      {
        name: 'crossRegion',
        type: 'checkbox',
        label: 'Enable Cross Region',
        defaultValue: false,
      },
    ],
  },
  gemini: {
    fields: [
      {
        name: 'apiKey',
        type: 'password',
        label: 'API Key',
        required: true,
        placeholder: 'Enter your Google API key',
      },
      {
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('gemini'),
      },
    ],
  },
  anthropic: {
    fields: [
      {
        name: 'apiKey',
        type: 'password',
        label: 'API Key',
        required: true,
        placeholder: 'Enter your Anthropic API key',
      },
      {
        name: 'baseUrl',
        type: 'text',
        label: 'Base URL (Optional)',
        placeholder: 'https://api.anthropic.com',
        defaultValue: 'https://api.anthropic.com',
      },
      {
        name: 'maxRetries',
        type: 'number',
        label: 'Max Retries',
        defaultValue: 3,
      },
      {
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('anthropic'),
      },
    ],
  },
};
