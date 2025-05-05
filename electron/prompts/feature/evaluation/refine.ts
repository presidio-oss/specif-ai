interface RefinePromptParams {
  requirements: string;
  technologies?: string;
  features?: string;
  evaluation?: string;
  extraContext?: string;
  referenceInformation?: string;
}

export function refinePrompt({
  requirements,
  technologies,
  features,
  evaluation,
  extraContext,
  referenceInformation,
}: RefinePromptParams): string {
  return `# REQUIREMENTS
${requirements}

${technologies ? `# Technical Details\n${technologies}\n` : ''}
${features ? `# FEATURES\n${features}\n` : ''}
${evaluation ? `# EVALUATION\n${evaluation}\n` : ''}
${extraContext ? `# extraContext\n${extraContext}\n` : ''}
${referenceInformation ? `### Additional Context:\n${referenceInformation}`:''}

# GUIDELINES
1. Review the current features split and the previous evaluation.
2. Split the requirements into features based on evaluation, these guidelines, and any additional insights from the extraContext.
3. Title them by their business goal and purpose: DON'T start their name with "Implement"
4. To determine the appropriate granularity of the features make sure each feature is
   - focused on a single business aspect of the requirements
   - cohesive business wise
   - prefer delivering incremental value to the user
     - for example if something can be delivered read only with a follow-up feature to edit or change, prefer that
5. Ensure that an individual feature is NOT too small to implement.
   - example of TOO SMALL:
     - "edit one field"
     - "when navigated to a link user can see a view"
     - "display a button, component on the screen"
     - "validate email field", etc.
6. Return each feature on a separate line. Do not add empty lines.
7. Return no other information, only a list of features.
   - NO additional text, headers, or footers
8. Avoid all generic features like Accessibility, error handling, scalability, Responsive Web Design, Data Security, sync integrity, ajax localstorage, secure application, Cross device compatibility etc., because these features are applicable for all the other features.
9. Combine all the features to maximum count of 5 features.
10. You are allowed to use Markdown for the description of the feature.

Remember, a feature is not a small task; it is a business functionality.
Make sure that the list of feature names FULLY addresses every aspect of the requirements and is enhanced by the extraContext provided.
Think step-by-step before providing a response.

Strictly consider this format to generate user story - 

Ability to <user action> the <feature>
In order to <mention the user need>
As a <the persona or user> 

I want the <end goal or objective of the feature>

# RESPONSE FORMAT EXAMPLE
{ 
  "features": [
    {
      "id": "US1",
      "title": "<title of feature 1>",
      "description": "[description of feature 1]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the feature 1 as sentences]"
    },
    {
      "id": "US2",
      "title": "<title of feature 2>",
      "description": "[description of feature 2]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the feature 2 as sentences]"
    },
    {
      "id": "US3",
      "title": "<title of feature 3>",
      "description": "[description of feature 3]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the feature 3 as sentences]"
    },
    {
      "id": "US4",
      "title": "<title of feature 4>",
      "description": "[description of feature 4]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the feature 4 as sentences]"
    },
    {
      "id": "US5",
      "title": "<title of feature 5>",
      "description": "[description of feature 5]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the feature 5 as sentences]"
    }
  ]
}

(!) return a list of features ONLY: no other headers, footers, or additional text. Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}
