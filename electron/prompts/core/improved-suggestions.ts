interface ImprovedSuggestionsParams {
  name: string;
  description?: string;
  type: string;
  requirement: string;
  suggestions: string[];
  selectedSuggestion?: string;
  knowledgeBase?: string;
}

export function generateImprovedSuggestionsPrompt(params: ImprovedSuggestionsParams): string {
  const { name, description, type, requirement, suggestions, selectedSuggestion, knowledgeBase } = params;

  let prompt = `You are an AI assistant tasked with generating 3 creative and practical one-liner suggestions (not more than 5 words each) to improve the following requirement.

Application Details:
- Name: ${name}
- Description: ${description || 'N/A'}
- Requirement Type: ${type}
- Abstract Requirement: ${requirement}

Your suggestions should be broad, versatile, and aimed at enhancing:
1. Clarity - making the requirement more specific and understandable
2. Feasibility - ensuring practical implementation
3. Innovation - providing creative approaches or solutions

Important rules:
- Each suggestion must be concise (5 words or less)
- Do not repeat any of these existing suggestions:
${suggestions.map(s => `- ${s}`).join('\n')}`;

  if (selectedSuggestion) {
    prompt += `\n\nThe user previously selected this suggestion but wants better alternatives:
"${selectedSuggestion}"
Your new suggestions should build upon this direction but offer improved alternatives.`;
  }

  if (knowledgeBase) {
    prompt += `\n\nUsing knowledge base constraint: ${knowledgeBase}`;
  }

  prompt += `\n\nOutput format: Return only a valid JSON array of strings without any code blocks or additional text:
["Suggestion 1", "Suggestion 2", "Suggestion 3"]`;
  
  return prompt;
}