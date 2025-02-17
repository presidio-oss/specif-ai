export interface suggestionPayload {
  name: string;
  description: string;
  type: string;
  requirement: string;
  suggestions?: Array<string>;
  selectedSuggestion?: string;
  knowledgeBase?: string;
}

export interface conversePayload {
  name: string;
  description: string;
  type: string;
  requirement: string;
  userMessage: string;
  requirementAbbr?: string;
  knowledgeBase?: string;
  us?: string;
  prd?: string;
  chatHistory?: Array<{}>;
}
