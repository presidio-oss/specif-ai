export interface TaskResearchPreferences {
  name: string;
  userStory: string;
  technicalDetails?: string;
  extraContext?: string;
}

export const getTaskPerspectives = (): string[] => {
  return [
    "- Implementation Perspective: Key approaches, patterns, frameworks, and steps needed to implement this task.",
    "- Technical Perspective: Important technical requirements, constraints, dependencies, and architectural considerations.",
    "- Testing Perspective: Key testing strategies, test cases, validation approaches, and quality considerations.",
    "- Performance Perspective: Important performance considerations, optimization opportunities, and efficiency requirements.",
  ];
};
