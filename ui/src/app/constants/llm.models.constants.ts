
export const AvailableProviders = [
  { displayName: 'Azure OpenAI', key: 'openai' },
  { displayName: 'OpenAI Native', key: 'openai-native' },
  { displayName: 'AWS Bedrock', key: 'bedrock' },
];

export const ProviderModelMap: { [key: string]: string[] } = {
    openai: ['gpt-4o', 'gpt-4o-mini'],
    'openai-native': ['gpt-4o', 'gpt-4o-mini'],
    bedrock: ['anthropic.claude-3-5-sonnet-20240620-v1:0']
};
