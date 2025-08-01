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
  appId: string;
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

export interface ChatWithAIPayload {
  requestId:string;
  project: {
    name: string;
    description: string;
  };
  chatHistory?: Array<{
    id?: string;
    type: 'user' | 'assistant' | 'tool';
    content?: Array<{
      type: 'text';
      content: string;
    }>;
    name?: string;
    tool_call_id?: string;
    toolCalls?: Array<{
      id?: string;
      name: string;
      args?: Record<string, any>;
    }>;
  }>;
  requirementAbbr: string;
  brds?: Array<BRD>;
  prd?: string;
  userStory?: string;
  recursionLimit?: number;
  requirement: {
    title?: string;
    description?: string;
  }
}

export interface ChatWithAIResponse {
  id?: string;
  tool_calls: Array<{
    id: string;
    name: string;
    args: Record<string, any>;
  }>;
  content:
    | string
    | Array<{
        type: 'text';
        content: string;
      }>;
}

export interface ChatUpdateRequirementResponse {
  response: string;
  blocked?: boolean;
  blockedReason?: string;
}

export interface InlineEditPayload {
  requestId: string;
  selectedText: string;
  userPrompt: string;
  context?: string;
  preserveFormatting?: boolean;
}

export interface InlineEditResponse {
  requestId: string;
  editedText: string;
  success: boolean;
  error?: string;
}
