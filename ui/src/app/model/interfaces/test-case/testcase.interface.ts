export interface ITestCaseStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface ITestCase {
  id: string;
  title: string;
  description: string;
  preConditions: string[];
  steps: ITestCaseStep[];
  priority: 'High' | 'Medium' | 'Low';
  type: 'Functional' | 'Integration' | 'UI/UX' | 'Performance' | 'Security';
}

export interface ITestCasesResponse {
  testCases: ITestCase[];
}

export interface ITestCaseRequest {
  appId: string;
  appName: string;
  appDescription: string;
  userStoryId: string;
  userStoryTitle: string;
  userStoryDescription: string;
  acceptanceCriteria?: string;
  technicalDetails?: string;
  userScreensInvolved?: string;
  extraContext?: string;
  regenerate: boolean;
}

export interface ThinkingProcessConfig {
  title: string;
  subtitle: string;
}
