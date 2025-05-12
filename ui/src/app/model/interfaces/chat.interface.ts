interface BedrockConfig {
  region: string;
  accessKey: string;
  secretKey: string;
  sessionKey?: string;
}

export interface BedrockValidationPayload extends BedrockConfig{
  kbId: string;
}

export interface BRD {
  title: string;
  requirement: string;
}

export interface suggestionPayload {
  name: string;
  description: string;
  type: string;
  requirement: string;
  requirementAbbr: string;
  suggestions?: Array<string>;
  selectedSuggestion?: string;
  knowledgeBase?: string;
  bedrockConfig?: BedrockConfig;
  brds?: Array<BRD>;
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
  brds?: Array<BRD>;
}

export interface ChatUpdateRequirementResponse {
  response: string;
  blocked?: boolean;
  blockedReason?: string;
}
