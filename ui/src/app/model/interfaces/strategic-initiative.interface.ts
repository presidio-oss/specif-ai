export interface IAddStrategicInitiativeRequest {
  title: string;
  requirement: string;
  requirementAbbr: 'SI';
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
  researchUrls?: string[];
}

export interface IUpdateStrategicInitiativeRequest {
  id: string;
  title: string;
  requirement: string;
  requirementAbbr: 'SI';
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
  researchUrls?: string[];
}

export interface IStrategicInitiativeResponse {
  id: string;
  title: string;
  requirement: string;
  requirementAbbr: 'SI';
  chatHistory: any[];
  status: 'DRAFT' | 'COMPLETE';
}
