export const TRACES = {
  CHAT_COMPLETION: "ChatCompletion",
  CHAT_BEDROCK_CONVERSE: "ChatBedrockConverse",
  CHAT_GEMINI: "ChatGoogleGenerativeAI",
  CHAT_OLLAMA: "OllamaCompletion",
  CHAT_OPENROUTER: "ChatOpenRouter",
  CHAT_ANTHROPIC: "ChatAnthropic",
};

export enum OPERATIONS {
  ADD = "add",
  UPDATE = "update",
  DELETE = "delete",
  CREATE = "create",
  CHAT = "chat",
  VISUALIZE = "visualize",
  SUGGEST = "suggest",
  GET = "get",
}

export const COMPONENT = {
  BP: "bp",
  STORY: "story",
  TASK: "task",
  SOLUTION: "solution",
  FLOWCHART: "flowchart",
};

export enum PromptMode {
  ADD = "add",
  UPDATE = "update",
}

export enum DbDocumentType {
  BRD = "brd",
  PRD = "prd",
  UIR = "uir",
  NFR = "nfr",
  BP = "bp",
  USER_STORY = "us",
  TASK = "task",
}

export enum USER_TYPE {
  USER = "user",
  ASSISTANT = "assistant"
}

export enum CHAT_INTENT {
  REQUIREMENT_UPDATE = "requirement_update",
  STORY_TASK_UPDATE = "story_task_update",
  SUGGESTION_GENERATION = "suggestion_generation",
}