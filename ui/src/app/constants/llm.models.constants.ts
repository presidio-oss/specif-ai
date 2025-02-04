
export const AvailableProviders = [
  { displayName: 'Azure OpenAI', key: 'OPENAI_COMPATIBLE_AZURE' },
  { displayName: 'OpenAI Native', key: 'OPENAI_NATIVE' },
  { displayName: 'AWS Bedrock', key: 'OPENAI_COMPATIBLE_CLAUDE' },
];

export const ProviderModelMap: { [key: string]: string[] } = {
    OPENAI_NATIVE: ['gpt-4o', 'gpt-4o-mini'],
    OPENAI_COMPATIBLE_AZURE: ['gpt-4o', 'gpt-4o-mini'],
    OPENAI_COMPATIBLE_CLAUDE: ['anthropic.claude-3-5-sonnet-20240620-v1:0']
};
