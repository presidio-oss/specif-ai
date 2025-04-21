import { RequirementType } from 'src/app/constants/app.constants';

export interface ISetRootDirectoryResponse {
  success: boolean;
  error?: string;
}
export interface IProject {
  project: string;
  metadata: IProjectMetadata;
}

export interface IGenerationRange {
  maxCount: number;
  isEnabled: boolean;
}

export interface IRequirementConfig {
  enabled?: boolean;
  maxCount?: number;
  count: number;
}

export interface IProjectMetadata {
  name?: string;
  description: string;
  frontend?: boolean;
  backend?: boolean;
  database?: boolean;
  deployment?: boolean;
  createReqt?: boolean;
  id: string;
  createdAt: string;
  BRD: IRequirementConfig;
  PRD: IRequirementConfig;
  UIR: IRequirementConfig;
  NFR: IRequirementConfig;
  BP: IRequirementConfig;
  US: IRequirementConfig;
  TASK: IRequirementConfig;
}

export interface ICreateSolutionRequest {
  name: string;
  description: string;
  createReqt: boolean;
  cleanSolution: boolean;
  brdPreferences: IGenerationRange;
  prdPreferences: IGenerationRange;
  uirPreferences: IGenerationRange;
  nfrPreferences: IGenerationRange;
}

export interface ISolutionResponseRequirementItem {
  id: string;
  title: string;
  requirement: string;
}

export interface ISolutionResponse {
  brd?: ISolutionResponseRequirementItem[];
  nfr?: ISolutionResponseRequirementItem[];
  prd?: (ISolutionResponseRequirementItem & { linkedBRDIds: Array<string> })[];
  uir?: ISolutionResponseRequirementItem[];
  createReqt: boolean;
  description: string;
  name: string;
}

export interface IBreadcrumb {
  label: string;
  url?: string;
  state?: {
    [key: string]: any;
  };
  tooltipLabel?: string;
}

export interface AppInfoResponse {
  solutionMetadata: SolutionMetadata[];
  documentMetadata: DocumentMetadata[];
  documents: Document[];
  integrations: any[]; 
}

export interface SolutionMetadata {
  id: number;
  name: string;
  description: string;
  technicalDetails: string;
  isBrownfield: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface DocumentMetadata {
  documentTypeId: string;
  count: number;
  typeName: string;
  typeLabel: string;
}

export interface Document {
  id: number;
  name: string;
  description: string;
  jiraId: string | null;
  documentTypeId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}