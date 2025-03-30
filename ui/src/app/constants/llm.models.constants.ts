export const AvailableProviders = [
  { displayName: 'Azure OpenAI', key: 'openai' },
  { displayName: 'OpenAI Native', key: 'openai-native' },
  { displayName: 'AWS Bedrock', key: 'bedrock' },
  { displayName: 'Gemini', key: 'gemini' },
  { displayName: 'Anthropic', key: 'anthropic' },
  { displayName: 'OpenRouter', key: 'openrouter' },
];

const OPENROUTER_FALLBACK_MODELS = [
  'google/gemini-2.5-pro-exp-03-25:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1:free',
];

export async function getProviderModels(provider: string): Promise<string[]> {
  if (provider === 'openrouter') {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      const receivedData = await response.json();
      const models = receivedData.data;
      return models.map((model: any) => model.id);
    } catch (error) {
      console.warn('Failed to fetch OpenRouter models, using fallback:', error);
      return OPENROUTER_FALLBACK_MODELS;
    }
  }

  const modelMap: { [key: string]: string[] } = {
    'openai': ['gpt-4o', 'gpt-4o-mini'],
    'openai-native': ['gpt-4o', 'gpt-4o-mini'],
    'bedrock': [
      'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'anthropic.claude-3-5-haiku-20241022-v1:0',
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
      'anthropic.claude-3-opus-20240229-v1:0',
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0',
    ],
    'gemini': [
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite-preview-02-05',
      'gemini-2.0-pro-exp-02-05',
      'gemini-2.0-flash-thinking-exp-01-21',
      'gemini-2.0-flash-thinking-exp-1219',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-exp-0827',
      'gemini-1.5-flash-8b-exp-0827',
      'gemini-1.5-pro-002',
      'gemini-1.5-pro-exp-0827',
      'gemini-exp-1206',
    ],
    'anthropic': [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  };

  return modelMap[provider] || [];
}
