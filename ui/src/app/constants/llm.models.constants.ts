
export const AvailableProviders = [
  { displayName: 'Azure OpenAI', key: 'openai' },
  { displayName: 'OpenAI Native', key: 'openai-native' },
  { displayName: 'AWS Bedrock', key: 'bedrock' },
  { displayName: 'Gemini', key: 'gemini' },
  { displayName: 'Anthropic', key: 'anthropic' },
];

export const ProviderModelMap: { [key: string]: string[] } = {
    'openai': ['gpt-4o', 'gpt-4o-mini'],
    'openai-native': ['gpt-4o', 'gpt-4o-mini'],
    'bedrock': [
      'anthropic.claude-3-7-sonnet-20250219-v1:0',
      'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'anthropic.claude-3-5-haiku-20241022-v1:0',
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
      'anthropic.claude-3-opus-20240229-v1:0',
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0'
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
      'gemini-exp-1206'
    ],
    'anthropic': [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ]
};
