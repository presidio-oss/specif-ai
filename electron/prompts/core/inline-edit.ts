/**
 * Prompt for the inline edit workflow
 * This function generates a prompt to improve text based on user instructions
 * @param selectedText The text that needs improvement
 * @param userPrompt The user's instructions for improving the text
 * @returns A formatted prompt string
 */
export const getInlineEditPrompt = (selectedText: string, userPrompt: string): string => {
  return `
  I have the following text that needs to be improved:
  
  "${selectedText}"
  
  Instructions: ${userPrompt}
  
  IMPORTANT FORMATTING INSTRUCTIONS:
  - Return the improved text as properly formatted markdown
  - You can use standard markdown formatting (bold, italic, lists, etc.)
  - You can use headings if appropriate (prefer h3 or smaller - ### or more #s)
  - Do NOT include any explanations about your edits
  - Do NOT wrap the entire response in quotes or code blocks
  - Just provide the improved text with proper markdown formatting
  `;
};
