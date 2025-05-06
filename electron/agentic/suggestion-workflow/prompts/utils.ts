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
    "- Domain Perspective: Key domain-specific concepts, best practices, and industry standards relevant to this requirement.",
    "- Technical Perspective: Important technical approaches, implementation strategies, frameworks, and architectures that could be applied.",
    "- Business Perspective: Key business goals, objectives, stakeholder considerations, and value proposition alignment.",
    "- Integration Perspective: Important integration points, dependencies, APIs, and system interactions to consider.",
  ];
};
