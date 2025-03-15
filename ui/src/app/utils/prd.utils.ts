import {
  processRequirementContentForEdit,
  processRequirementContentForView,
} from './requirement.utils';

const SECTION_NAMES = ['Screens:', 'Personas:'];

// TODO: decide if we want to tamper with the content
// Function to process PRD content for editing
export const processPRDContentForEdit = (content: string): string => {
  return processRequirementContentForEdit(content, SECTION_NAMES);
};

// Main function to process PRD content for viewing
export const processPRDContentForView = (
  content: string,
  maxChars: number,
): string => {
  return processRequirementContentForView(content, maxChars, SECTION_NAMES);
};
