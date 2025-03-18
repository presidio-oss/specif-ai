import {
  processRequirementContentForView
} from './requirement.utils';

const SECTION_NAMES = ['Acceptance Criteria:'];

export const processUserStoryContentForView = (
  content: string,
  maxChars?: number,
): string => {
  return processRequirementContentForView(content, {
    maxChars: maxChars,
    sectionNames: SECTION_NAMES,
  });
};
