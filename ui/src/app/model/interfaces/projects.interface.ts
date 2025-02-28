export interface IProject {
  project: string;
  metadata: IProjectMetadata;
}

export interface IGenerationRange {
  max_count: number;
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
}

export interface ICreateSolutionRequest {
  name: string;
  description: string;
  createReqt: boolean;
  cleanSolution: boolean;
  brd: IGenerationRange;
  prd: IGenerationRange;
  uir: IGenerationRange;
  nfr: IGenerationRange;
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
