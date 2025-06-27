/**
 * Prompts for the test case workflow
 */

/**
 * Builds the research prompt for gathering information for test case generation
 */
export const buildResearchPrompt = (
  userStoryTitle: string,
  userStoryDescription: string,
  acceptanceCriteria: string,
  technicalDetails: string,
  userScreensInvolved: string,
  extraContext: string,
  prdId: string,
  prdTitle: string,
  prdDescription: string
): string => {
  return `Please analyze this user story and gather relevant information for test case generation:
Story Title: ${userStoryTitle}
Story Description: ${userStoryDescription}
${prdId ? `PRD ID: ${prdId}` : ""}
${prdTitle ? `PRD Title: ${prdTitle}` : ""}
${prdDescription ? `PRD Description: ${prdDescription}` : ""}
${acceptanceCriteria ? `Acceptance Criteria: ${acceptanceCriteria}` : ""}
${technicalDetails ? `Technical Details: ${technicalDetails}` : ""}
${userScreensInvolved ? `User Screens Involved: ${userScreensInvolved}` : ""}
${extraContext ? `Additional Context: ${extraContext}` : ""}

Consider the following aspects:
1. Core functionality that needs testing
2. User interactions and workflows
3. Technical requirements and constraints
4. Edge cases and potential failure scenarios
5. Integration points with other system components`;
};

/**
 * Builds the prompt for generating test cases
 */
export const buildGenerateTestCasesPrompt = (
  userStoryTitle: string,
  userStoryDescription: string,
  acceptanceCriteria: string,
  technicalDetails: string,
  userScreensInvolved: string,
  extraContext: string,
  referenceInformation: string,
  prdId: string,
  prdTitle: string,
  prdDescription: string,
  existingTestCases?: any[],
  evaluation?: string
): string => {
  const isRefinement = existingTestCases && existingTestCases.length > 0;
  
  let prompt = `${isRefinement ? 'Refine' : 'Generate'} comprehensive test cases for the following user story following best practices from factifai.io:

Story Title: ${userStoryTitle}
Story Description: ${userStoryDescription}
${prdId ? `PRD ID: ${prdId}` : ""}
${prdTitle ? `PRD Title: ${prdTitle}` : ""}
${prdDescription ? `PRD Description: ${prdDescription}` : ""}
${acceptanceCriteria ? `Acceptance Criteria: ${acceptanceCriteria}` : ""}
${technicalDetails ? `Technical Details: ${technicalDetails}` : ""}
${userScreensInvolved ? `User Screens Involved: ${userScreensInvolved}` : ""}
${extraContext ? `Additional Context: ${extraContext}` : ""}

Research Information: ${referenceInformation}`;

  if (isRefinement && evaluation) {
    prompt += `\n\nPrevious test cases that need improvement:
${JSON.stringify(existingTestCases, null, 2)}

Evaluation feedback:
${evaluation}

Please refine these test cases based on the feedback. Keep the good parts and improve the areas that need enhancement.`;
  }

  prompt += `\n\nFollow these guidelines:
1. Each test case should be specific and focused on a single aspect
2. Include clear steps with expected results
3. Consider positive and negative test scenarios
4. Include edge cases and boundary conditions
5. Consider different user roles and permissions if applicable
6. Test error handling and validation
7. Include integration test cases where relevant
8. Consider performance and security aspects
9. Ensure test cases are traceable to requirements
10. Make test cases reusable and maintainable

IMPORTANT: Strictly Return ONLY a valid JSON object with no additional text, comments, or markdown formatting before or after. Your entire response must be a valid JSON object that can be parsed directly.

Strictly Return the test cases in the following JSON format:
{
  "testCases": [
    {
      "id": "TC-1",
      "title": "Test case title",
      "description": "Detailed description of what is being tested",
      "preConditions": ["List of conditions that must be met before test execution"],
      "postConditions": ["Optional list of conditions that should be true after test execution"],
      "steps": [
        {
          "stepNumber": 1,
          "action": "Specific action to take",
          "expectedResult": "Expected outcome of the action"
        }
      ],
      "priority": "High|Medium|Low",
      "type": "Functional|Integration|UI/UX|Performance|Security",
    }
  ]
}

Strictly do not include any explanatory text, markdown formatting, or code blocks. The response must be a raw JSON object only.`;

  return prompt;
};

/**
 * Builds the prompt for evaluating test cases
 */
export const buildEvaluateTestCasesPrompt = (
  userStoryTitle: string,
  userStoryDescription: string,
  acceptanceCriteria: string,
  userScreensInvolved: string,
  testCases: any[],
  prdId: string,
  prdTitle: string,
  prdDescription: string
): string => {
  return `Evaluate the following test cases for quality and completeness:

Story Title: ${userStoryTitle}
Story Description: ${userStoryDescription}
${prdId ? `PRD ID: ${prdId}` : ""}
${prdTitle ? `PRD Title: ${prdTitle}` : ""}
${prdDescription ? `PRD Description: ${prdDescription}` : ""}
${acceptanceCriteria ? `Acceptance Criteria: ${acceptanceCriteria}` : ""}
${userScreensInvolved ? `User Screens Involved: ${userScreensInvolved}` : ""}

Test Cases:
${JSON.stringify(testCases, null, 2)}

Evaluate based on these criteria:
1. Coverage of all requirements and acceptance criteria
2. Clarity and completeness of test steps
3. Appropriate test types and priorities
4. Edge cases and error scenarios coverage
5. Integration testing coverage where needed
6. Performance and security considerations
7. Adherence to best practices

Evaluate each test case individually and provide a JSON response with the following structure:
{
  "overallEvaluation": "APPROVED AND READY FOR REFINEMENT" or "NEEDS IMPROVEMENT",
  "testCaseEvaluations": [
    {
      "id": "TC-1",
      "status": "PASS" or "FAIL",
      "feedback": "Specific feedback on what needs improvement (if status is FAIL)"
    },
    ...
  ],
  "summary": "Overall summary of the evaluation, including statistics on how many test cases passed/failed"
}

If all test cases meet the criteria, set overallEvaluation to "APPROVED AND READY FOR REFINEMENT".
Otherwise, set it to "NEEDS IMPROVEMENT" and provide specific feedback for each failing test case.`;
};
