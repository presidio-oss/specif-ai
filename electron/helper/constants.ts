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
  SUGGEST = 'suggest'
}

export const COMPONENT = {
  BP: "bp",
  STORY: "story",
  TASK: "task",
  SOLUTION: "solution",
  FLOWCHART: "flowchart",
};

export const OPERATION_ID = {
  CREATE_SOLUTION: (projectId: string) => `create-solution-${projectId}`,
};

export const WORKFLOW_CHANNEL = {
  SOLUTION_PROGRESS: (projectId: string) => `solution:${projectId}-workflow-progress`,
};
