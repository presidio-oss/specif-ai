export interface UserStoryResearchPreferences {
  requirements: string;
  technicalDetails?: string;
  extraContext?: string;
}

export const getUserStoryPerspectives = (): string[] => {
  return [
    "- User Perspective: Key insights about target users, their needs, goals, pain points, and expectations.",
    "- Business Perspective: Key business goals, objectives, stakeholders, and any value propositions.",
    "- Technical Perspective: Important technical constraints, possibilities, and considerations relevant to the requirements implementation.",
    "- Testing Perspective: Key considerations for acceptance criteria, validation approaches, and quality expectations.",
  ];
};
