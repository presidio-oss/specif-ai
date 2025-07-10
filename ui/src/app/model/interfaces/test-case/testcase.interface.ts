// Define enums and constants for test case component
export enum TestCaseMode {
  VIEW = 'view',
  EDIT = 'edit',
  ADD = 'add'
}

export enum TestCaseStatus {
  ACTIVE = 'Active',
  DRAFT = 'Draft',
  DEPRECATED = 'Deprecated',
  ARCHIVED = 'Archived'
}

export const TEST_CASE_PRIORITY = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
} as const;

export type TestCasePriority = typeof TEST_CASE_PRIORITY[keyof typeof TEST_CASE_PRIORITY];

export const TEST_CASE_TYPE = {
  FUNCTIONAL: 'Functional',
  INTEGRATION: 'Integration',
  UI_UX: 'UI/UX',
  PERFORMANCE: 'Performance',
  SECURITY: 'Security'
} as const;

export type TestCaseType = typeof TEST_CASE_TYPE[keyof typeof TEST_CASE_TYPE];

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
  postConditions?: string[];
  steps: ITestCaseStep[];
  priority: TestCasePriority;
  type: TestCaseType;
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
  prdId?: string;
  prdTitle?: string;
  prdDescription?: string;
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
