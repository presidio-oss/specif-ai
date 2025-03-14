import {
  processRequirementContentForEdit,
  processRequirementContentForView,
} from './requirement.utils';

const SECTION_NAMES = ['Acceptance Criteria:'];

// TODO: decide if we want to tamper with the content
// Function to process Task content for editing
export const processTaskContentForEdit = (content: string): string => {
  return processRequirementContentForEdit(content, SECTION_NAMES);
};

// Main function to process Task content for viewing
export const processTaskContentForView = (
  content: string,
  maxChars: number,
): string => {
  return processRequirementContentForView(content, maxChars, SECTION_NAMES);
};
