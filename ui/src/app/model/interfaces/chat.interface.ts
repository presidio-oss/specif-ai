interface BedrockConfig {
  region: string;
  accessKey: string;
  secretKey: string;
  sessionKey?: string;
}

export interface suggestionPayload {
  name: string;
  description: string;
  type: string;
  requirement: string;
  suggestions?: Array<string>;
  selectedSuggestion?: string;
  knowledgeBase?: string;
  bedrockConfig?: BedrockConfig;
}

export interface conversePayload {
  name: string;
  description: string;
  type: string;
  requirement: string;
  userMessage: string;
  requirementAbbr?: string;
  knowledgeBase?: string;
  bedrockConfig?: BedrockConfig;
  us?: string;
  prd?: string;
  chatHistory?: Array<{}>;
}

export interface ChatUpdateRequirementResponse {
  response: string;
}
