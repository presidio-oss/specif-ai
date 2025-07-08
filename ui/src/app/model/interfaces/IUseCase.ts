export interface ContextItem {
  type: "url" | "docx";
  source: string;
  summary?: string;
}

export interface IAddUseCaseRequest {
  title: string;
  requirement: string;  // This will contain the full proposal content
  requirementAbbr: 'UC';
  context: ContextItem[];
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
}

export interface IUpdateUseCaseRequest {
  id: string;
  title: string;
  requirement: string;  // This will contain the full proposal content
  requirementAbbr: 'UC';
  context: ContextItem[];
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
}

export interface IUseCaseResponse {
  id: string;
  title: string;
  requirement: string;  // This will contain the full proposal content
  requirementAbbr: 'UC';
  context: ContextItem[];
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
}
