export interface RequestEpic {
  epicName: string;
  epicDescription: string;
  pmoId: string;
  projectKey: string;
  features: RequestFeature[];
}

export interface RequestFeature {
  id: string;
  name: string;
  pmoId: string;
  description: string;
  tasks: RequestTask[];
  chatHistory: RequestChatHistory[];
}

export interface RequestTask {
  id: string;
  pmoId: string;
  list: string;
  acceptance: string | string[];
}

export interface RequestChatHistory {
  user?: string;
  assistant?: string;
  isAdded?: boolean;
}

export interface ResponseEpic {
  epicName: string;
  pmoId: string;
  features: ResponseFeature[];
}

export interface ResponseFeature {
  storyName: string;
  pmoId: string;
  tasks: ResponseTask[];
}

export interface ResponseTask {
  subTaskName: string;
  pmoId: string;
}


