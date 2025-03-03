
export const AvailableProviders = [
  { displayName: 'Azure OpenAI', key: 'openai' },
  { displayName: 'OpenAI Native', key: 'openai-native' },
  { displayName: 'AWS Bedrock', key: 'bedrock' },
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
    ]
};
