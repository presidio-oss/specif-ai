import { REQUIREMENT_TYPE, REQUIREMENT_DISPLAY_NAME_PLURAL_MAP } from '../../../constants/requirement.constants';

export interface RequirementPreference {
  isEnabled: boolean;
  minCount: number;
}

export type RequirementPreferences = {
  [K in keyof typeof REQUIREMENT_TYPE]?: RequirementPreference;
};

export function getEnabledRequirementTypes(preferences: RequirementPreferences): Array<keyof typeof REQUIREMENT_TYPE> {
  return Object.entries(preferences)
    .filter(([_, pref]) => pref?.isEnabled)
    .map(([type]) => type as keyof typeof REQUIREMENT_TYPE);
}

export function formatRequirementTypes(types: Array<keyof typeof REQUIREMENT_TYPE>): string {
  if (types.length === 0) return '';
  if (types.length === 1) return REQUIREMENT_DISPLAY_NAME_PLURAL_MAP[types[0]];
  
  const lastType = types[types.length - 1];
  const otherTypes = types.slice(0, -1);
  return `${otherTypes.map(type => REQUIREMENT_DISPLAY_NAME_PLURAL_MAP[type]).join(', ')}, and ${REQUIREMENT_DISPLAY_NAME_PLURAL_MAP[lastType]}`;
}

export function getRequirementPerspectives(types: Array<keyof typeof REQUIREMENT_TYPE>): string[] {
  const perspectives: Record<string, string> = {
    [REQUIREMENT_TYPE.PRD]: '- User Perspective: Key insights about target users, their needs, pain points, and expectations.',
    [REQUIREMENT_TYPE.BRD]: '- Business Perspective: Key business goals, objectives, stakeholders, and any relevant market or competitive information.',
    [REQUIREMENT_TYPE.UIR]: '- UI/UX Perspective: Insights related to user interface design, usability, and user experience considerations.',
    [REQUIREMENT_TYPE.NFR]: '- Non-Functional Perspective: Important considerations for performance, security, scalability, reliability, and other quality attributes.',
  };

  return types.map(type => perspectives[type]).filter((perspective): perspective is string => perspective !== undefined);
}
