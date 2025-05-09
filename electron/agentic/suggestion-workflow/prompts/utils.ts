export interface SuggestionResearchPreferences {
  name: string;
  description: string;
  type: string;
  requirement: string;
  requirementAbbr: string;
  knowledgeBase?: string;
}

export const getSuggestionPerspectives = (): string[] => {
  return [
    "- Clarity Enhancement Perspective: Research to identify ways to make the requirement more specific, understandable, and well-defined - what details could be clarified or better specified?",
    "- Practical Implementation Perspective: Research about feasibility, technical approaches, and practical solutions - how can this be implemented effectively?",
    "- Innovation Opportunities Perspective: Research to discover creative approaches, modern solutions, and innovative alternatives - what new ideas could enhance this requirement?",
    "- Requirement Context Perspective: Research about requirement type-specific considerations (PRD, BRD, etc.) and related business requirements - how does this fit into the broader context?",
    "- Concise Expression Perspective: Research to find precise, impactful ways to express improvements in 5 words or less - how can we suggest enhancements concisely?",
  ];
};
