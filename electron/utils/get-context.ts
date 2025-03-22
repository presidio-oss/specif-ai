import { BRD_CONTEXT } from "../prompts/context/brd";
import { NFR_CONTEXT } from "../prompts/context/nfr";
import { PRD_CONTEXT } from "../prompts/context/prd";
import { UIR_CONTEXT } from "../prompts/context/uir";

export function getContextAndType(type: 'BRD' | 'PRD' | 'UIR' | 'NFR'): { context: string; requirementType: string; format: string } {
  switch (type) {
    case 'BRD':
      return {
        context: BRD_CONTEXT,
        requirementType: 'Business Requirements',
        format: '{"title": <title>, "requirement": <requirement>}'
      };
    case 'PRD':
      return {
        context: PRD_CONTEXT,
        requirementType: 'Product Requirements',
        format: '{"title": <title>, "requirement": "<requirement>  \\n#### Screens:  \\n<Screen Description>  \\n#### Personas:  \\n<Persona Description>"}'
      };
    case 'NFR':
      return {
        context: NFR_CONTEXT,
        requirementType: 'Non-Functional Requirements',
        format: '{"title": <title>, "requirement": <requirement>}'
      };
    case 'UIR':
      return {
        context: UIR_CONTEXT,
        requirementType: 'User Interface Requirements',
        format: '{"title": <title>, "requirement": <requirement>}'
      };
  }
}