import { RequirementType } from 'src/app/constants/app.constants';

export interface IProject {
  project: string;
  metadata: IProjectMetadata;
}

export interface IGenerationRange {
  minCount: number;
  isEnabled: boolean;
}

export interface IRequirementConfig {
  enabled?: boolean;
  minCount?: number;
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
  id: string;
  name: string;
  description: string;
  createReqt: boolean;
  cleanSolution: boolean;
  brdPreferences: IGenerationRange;
  prdPreferences: IGenerationRange;
  uirPreferences: IGenerationRange;
  nfrPreferences: IGenerationRange;
  mcpSettings?: string;
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
