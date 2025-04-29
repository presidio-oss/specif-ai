export interface IGetBusinessProcessRequest {
  solutionId: number;
  businessProcessId: number;
}

export interface IGetBusinessProcessResponse {
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  id: number;
  name: string;
  description: string;
  flowchart: string | null;
  documents: ({
    id: number;
    businessProcessId: number;
    documentId: number;
    docType: 'PRD' | 'BRD';
  } | null)[];
}

export interface ILLMresponse {
  requirement: string;
  title: string;
}

export interface IRequirementDetail {
  reqId: string;
  reqDesc: string;
}

export interface IFlowChartRequest {
  id: string;
  title: string;
  description: string;
  selectedBRDs: number[];
  selectedPRDs: number[];
}

export interface IFlowchartResponse {
  flowChartData: string;
}

export interface IUpdateProcessRequest {
  selectedBRDs: number[];
  selectedPRDs: number[];
  name: string;
  description: string;
  solutionId: number;
  businessProcessId: number;
}

export interface IAddBusinessProcessRequest {
  selectedBRDs: number[];
  selectedPRDs: number[];
  name: string;
  description: string;
  solutionId: number;
}

export interface IAddBusinessProcessResponse {
  reqt: string;
  contentType: string;
  id: string;
  title: string;
  addReqtType: string;
  name: string;
  description: string;
  useGenAI: boolean;
  selectedBRDs: number[];
  selectedPRDs: number[];
  LLMreqt: ILLMresponse;
}

export interface IUpdateProcessResponse {
  contentType: string;
  description: string;
  id: string;
  name: string;
  reqDesc: string;
  reqId: string;
  selectedBRDs: number[];
  selectedPRDs: number[];
  title: string;
  updated: ILLMresponse;
  updatedReqt: string;
  useGenAI: boolean;
}
