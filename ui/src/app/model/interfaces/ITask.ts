export interface ITask {
    subTaskTicketId?: string;
    id: string;
    list: string;
    acceptance: string;
    chatHistory?: [];
}

export interface ITasksResponse {
    appId: string;
    description: string;
    featureId: string;
    name: string;
    tasks: ITaskResponse[];
    regenerate: boolean;
    reqDesc: string;
    reqId: string;
}

export interface ITaskResponse {
    id: string;
    [key: string]: string;
}

export interface ITaskRequest {
    appId: string;
    appName: string;
    appDescription: string;
    reqId: string;
    featureId: string;
    name: string;
    description: string;
    regenerate: boolean;
    technicalDetails: string;
    extraContext?: string;
}

export interface IEditTaskRequest {
    name: string;
    description: string;
    appId: string;
    featureId: string;
    taskId: string;
    contentType: string;
    fileContent: string;
    reqId: string;
    reqDesc: string;
    useGenAI: boolean;
    usIndex: number;
    existingTaskTitle: string;
    existingTaskDesc: string;
    taskName: string;
}

export interface IAddTaskRequest{
  name: string;
  description: string;
  appId: string;
  featureId: string;
  taskId: string;
  contentType: string;
  fileContent: string;
  reqId: string;
  taskName: string;
  reqDesc: string;
  useGenAI: boolean;
  usIndex: number;
}

export interface IEditTaskResponse{
  contentType: string;
  description: string;
  fileContent: string;
  id: string;
  name: string;
  reqDesc: string;
  reqId: string;
  updated: {
    requirement: string;
    title: string;
  };
  updatedReqt: string;
  useGenAI: boolean;
}

export interface IAddTaskResponse{
  LLMreqt: {
    requirement: string;
    title: string;
  };
  addReqtType: string;
  contentType: string;
  description: string;
  fileContent: string;
  id: string;
  name: string;
  reqt: string;
  title: string;
  useGenAI: boolean;
}
