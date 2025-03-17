import { processRequirementContentForView } from './requirement.utils';

const SECTION_NAMES = ['Screens:', 'Personas:'];

export const processPRDContentForView = (
  content: string,
  maxChars?: number,
): string => {
  return processRequirementContentForView(content, {
    maxChars: maxChars,
    sectionNames: SECTION_NAMES,
  });
};
