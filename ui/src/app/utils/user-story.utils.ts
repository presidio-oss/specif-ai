import {
  processRequirementContentForEdit,
  processRequirementContentForView,
} from './requirement.utils';

const SECTION_NAMES = ['Acceptance Criteria:'];

// TODO: decide if we want to tamper with the content
// Function to process UserStory content for editing
export const processUserStoryContentForEdit = (content: string): string => {
  return processRequirementContentForEdit(content, SECTION_NAMES);
};

// Main function to process UserStory content for viewing
export const processUserStoryContentForView = (
  content: string,
  maxChars: number,
): string => {
  return processRequirementContentForView(content, maxChars, SECTION_NAMES);
};
