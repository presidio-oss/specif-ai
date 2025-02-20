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
  selectedBRDs: string[];
  selectedPRDs: string[];
}

export interface IUpdateProcessRequest {
  updatedReqt: string;
  contentType: string;
  id: string;
  title: string;
  name: string;
  description: string;
  useGenAI: boolean;
  selectedBRDs: string[];
  selectedPRDs: string[];
  reqId: string;
  reqDesc: string;
}

export interface IAddBusinessProcessRequest {
  reqt: string;
  contentType: string;
  id: string;
  title: string;
  addReqtType: string;
  name: string;
  description: string;
  useGenAI: boolean;
  selectedBRDs: string[];
  selectedPRDs: string[];
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
  selectedBRDs: string[];
  selectedPRDs: string[];
  LLMreqt: ILLMresponse;
}

export interface IUpdateProcessResponse {
  contentType: string;
  description: string;
  id: string;
  name: string;
  reqDesc: string;
  reqId: string;
  selectedBRDs: string[];
  selectedPRDs: any[];
  title: string;
  updated: ILLMresponse;
  updatedReqt: string;
  useGenAI: boolean;
}
