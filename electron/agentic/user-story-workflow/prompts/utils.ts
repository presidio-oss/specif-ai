export interface UserStoryResearchPreferences {
  appName: string;
  appDescription: string;
  requirements: string;
  technicalDetails?: string;
  extraContext?: string;
}

export const getUserStoryPerspectives = (): string[] => {
  return [
    "- Story Structure Perspective: Research to identify 'As a [persona]' (who is the user?), 'I want [action]' (what do they want to do?), and 'In order to [benefit]' (what value do they get?).",
    "- Feature Ability Perspective: Research to define 'Ability to [specific action]' with [feature] - what exact capability are we providing and how will users interact with it?",
    "- Acceptance Details Perspective: Research about interface elements (buttons, fields, icons), behaviors (clicks, inputs, responses), and validations (rules, constraints) needed.",
    "- User Value Perspective: Research about user needs being addressed, problems being solved, and outcomes being achieved through this story.",
    "- Implementation Context Perspective: Research about system behaviors, error handling, and non-functional requirements that ensure a complete and robust story.",
  ];
};
