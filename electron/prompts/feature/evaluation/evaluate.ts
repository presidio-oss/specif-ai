interface EvaluatePromptParams {
  requirements: string;
  features: string;
}

export function evaluatePrompt({
  requirements,
  features
}: EvaluatePromptParams): string {
  return `# INSTRUCTIONS
As a Business Analyst, your task is to evaluate the following feature names against the original requirements and decide whether the feedback is needed.

Your goal is to make sure requirements are split into features that are:
 - focused on a single business aspect of the requirements
 - cohesive business-wise
 - clear, concise
 - simple to implement by the engineering team

Remember feature is not a small task but a business functionality

# FEATURES
${features}

# REQUIREMENTS
${requirements}

# RESPONSE FORMAT

**chain of thought**
<before providing a response think step by step>

**feedback about each feature**
<feedback for individual features>
<DON'T include features that are satisfactory>

# GUIDELINES
1. Review features and assess whether it aligns with the original requirements
   - ask to remove any features that are not aligned with the requirements
2. Determine whether this split needs to change, provide feedback accordingly
3. (!) Prefer delivering incremental value to the user
       - for example if something can be delivered read only with a follow-up feature to edit or change, prefer that
4. Ensure that an individual feature is NOT too small to implement.
   - example of TOO SMALL:
     - "edit one field"
     - "when navigated to a link user can see a view"
     - "display a button, component on the screen"
     - "validate email field", etc.
5. Don't include features that are satisfactory in the response
6. Strictly follow the "RESPONSE FORMAT" provided above
7. Only in case there no suggestions or improvements to the split, reply with "APPROVED AND READY FOR REFINEMENT" in uppercase
8. If the features are not split well and require to be split differently, provide feedback indicating so.

Make sure that the list of feature names FULLY addresses every aspect of the requirements.
Remember, these are not full descriptions of the features, but a high-level feature names.`;
}
