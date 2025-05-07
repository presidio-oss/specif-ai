export interface TaskResearchPreferences {
  appName: string;
  appDescription: string;
  name: string;
  description: string;
  technicalDetails?: string;
  extraContext?: string;
}

export const getTaskPerspectives = (): string[] => {
  return [
    "- Technical Details Perspective: Research to extract exact technical specifications (paths, identifiers, data structures), naming conventions, and patterns that must be implemented.",
    "- Implementation Scope Perspective: Research to identify specific code-level tasks needed - what functions, modules, or methods need to be created or modified?",
    "- Feature Integration Perspective: Research about how this implementation connects with existing systems, APIs, or components mentioned in the requirements.",
    "- Validation & Testing Perspective: Research about required validations, error handling, and testing requirements specific to this feature implementation.",
    "- Code Quality Perspective: Research about performance requirements, scaling considerations, and best practices specific to the implementation tasks.",
  ];
};
