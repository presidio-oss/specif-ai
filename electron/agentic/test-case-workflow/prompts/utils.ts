import { createTestCaseResearchInformationPrompt } from "./research-information";
import { createSummarizeTestCaseResearchPrompt } from "./summarize-research";

export const TestCasePrompts = {
  createTestCaseResearchInformationPrompt,
  createSummarizeTestCaseResearchPrompt,
};

export const formatTestCaseId = (index: number): string => {
  return `TC-${String(index + 1).padStart(2, '0')}`;
};

export const validateTestCase = (testCase: any): boolean => {
  try {
    if (!testCase.id || !testCase.title || !testCase.description) {
      return false;
    }

    if (!Array.isArray(testCase.steps) || testCase.steps.length === 0) {
      return false;
    }

    for (const step of testCase.steps) {
      if (!step.stepNumber || !step.action || !step.expectedResult) {
        return false;
      }
    }

    if (testCase.priority && !["High", "Medium", "Low"].includes(testCase.priority)) {
      return false;
    }

    if (testCase.type && !["Functional", "Integration", "UI/UX", "Performance", "Security"].includes(testCase.type)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const sanitizeTestCases = (testCases: any[]): any[] => {
  return testCases
    .filter(validateTestCase)
    .map((tc, index) => ({
      ...tc,
      id: formatTestCaseId(index),
    }));
};
