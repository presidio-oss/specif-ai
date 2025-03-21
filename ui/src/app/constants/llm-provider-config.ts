import { ProviderModelMap } from './llm.models.constants';
export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'checkbox' | 'select';
  label: string;
  required?: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
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
  return (ProviderModelMap[provider] || []).map(model => ({
    value: model,
    label: model
  }));
};

export const LLM_PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  'openai': {
    fields: [
      { name: 'endpoint', type: 'text', label: 'Base URL', required: true },
      { name: 'apiKey', type: 'password', label: 'API Key', required: true },
      { name: 'deployment', type: 'text', label: 'Deployment ID', required: true },
      { name: 'apiVersion', type: 'text', label: 'API Version', required: true }
    ]
  },
  'openai-native': {
    fields: [
      { name: 'apiKey', type: 'password', label: 'API Key', required: true },
      { 
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('openai-native')
      }
    ]
  },
  'bedrock': {
    fields: [      
      { 
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('bedrock')
      },
      { name: 'accessKeyId', type: 'text', label: 'Access Key ID', required: true },
      { name: 'secretAccessKey', type: 'password', label: 'Secret Access Key', required: true },
      { name: 'sessionToken', type: 'password', label: 'Session Token' },
      { 
        name: 'region',
        type: 'select',
        label: 'Region',
        required: true,
        options: BEDROCK_REGIONS
      },
      { name: 'crossRegion', type: 'checkbox', label: 'Enable Cross Region', defaultValue: false },
    ]
  },
  'gemini': {
    fields: [
      { name: 'apiKey', type: 'password', label: 'API Key', required: true },
      { 
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('gemini')
      }
    ]
  },
  'anthropic': {
    fields: [
      { name: 'apiKey', type: 'password', label: 'API Key', required: true },
      { name: 'baseUrl', type: 'text', label: 'Base URL (Optional)' },
      { name: 'maxRetries', type: 'number', label: 'Max Retries', defaultValue: 3 },
      { 
        name: 'model',
        type: 'select',
        label: 'Model',
        required: true,
        options: getModelOptions('anthropic')
      }
    ]
  }
};
