export const createSummarizeTestCaseResearchPrompt = ({
  userStoryTitle,
  userStoryDescription,
  acceptanceCriteria,
  technicalDetails,
  extraContext,
}: {
  userStoryTitle: string;
  userStoryDescription: string;
  acceptanceCriteria?: string;
  technicalDetails?: string;
  extraContext?: string;
}) => {
  return `Based on the research conducted for the following user story, summarize the key findings that will guide test case generation:

Story Title: ${userStoryTitle}
Story Description: ${userStoryDescription}
${acceptanceCriteria ? `Acceptance Criteria: ${acceptanceCriteria}` : ''}
${technicalDetails ? `Technical Details: ${technicalDetails}` : ''}
${extraContext ? `Additional Context: ${extraContext}` : ''}

Summarize your findings in these key areas:

1. Core Functionality Testing
   - Identify the main features that need testing
   - List critical business rules and validations
   - Outline data requirements and constraints

2. User Interaction Scenarios
   - Document primary user workflows
   - Identify alternative paths and edge cases
   - List potential error scenarios

3. Technical Testing Requirements
   - Note integration points and dependencies
   - Identify performance critical areas
   - List security considerations
   - Document data persistence requirements

4. Test Coverage Areas
   - Functional test requirements
   - Integration test requirements
   - UI/UX test requirements
   - Performance test requirements
   - Security test requirements

5. Test Case Priorities
   - Critical path test cases
   - High-risk areas
   - Edge cases and boundary conditions

Follow the factifai.io test case writing guidelines in your summary:
- Be specific and focused
- Include clear preconditions
- Consider both positive and negative scenarios
- Include edge cases and boundary conditions
- Consider different user roles
- Include error handling scenarios
- Consider integration points
- Include performance and security aspects
- Ensure traceability to requirements
- Focus on reusability and maintainability

Return your findings in a structured format that will be used to generate comprehensive test cases.`;
};
