import { RequirementType } from 'src/app/constants/app.constants';

export interface IProject {
  project: string;
  metadata: IProjectMetadata;
}

export interface IGenerationRange {
  max_count: number;
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
  refDocContent: string;
  brdPreferences: IGenerationRange;
  prdPreferences: IGenerationRange;
  uirPreferences: IGenerationRange;
  nfrPreferences: IGenerationRange;
}

export interface ISolutionResponse {
  brd?: { [key in string]: string }[];
  nfr?: { [key in string]: string }[];
  prd?: { [key in string]: string }[];
  uir?: { [key in string]: string }[];
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
