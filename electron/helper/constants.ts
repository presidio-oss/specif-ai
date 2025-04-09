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
  VISUALIZE = "visualize"
}

export const COMPONENT = {
  BP: "bp",
  STORY: "story",
  TASK: "task",
  SOLUTION: "solution",
  FLOWCHART: "flowchart"
};
