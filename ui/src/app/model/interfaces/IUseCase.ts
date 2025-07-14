export interface IAddUseCaseRequest {
  title: string;
  requirement: string;  // This will contain the full proposal content
  requirementAbbr: 'SI';
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
}

export interface IUpdateUseCaseRequest {
  id: string;
  title: string;
  requirement: string;  // This will contain the full proposal content
  requirementAbbr: 'SI';
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
}

export interface IUseCaseResponse {
  id: string;
  title: string;
  requirement: string;  // This will contain the full proposal content
  requirementAbbr: 'SI';
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
}
