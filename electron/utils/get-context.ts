import { DBQueryConfig } from "drizzle-orm";
import { BP_CONTEXT } from "../prompts/context/bp";
import { BRD_CONTEXT } from "../prompts/context/brd";
import { NFR_CONTEXT } from "../prompts/context/nfr";
import { PRD_CONTEXT } from "../prompts/context/prd";
import { UIR_CONTEXT } from "../prompts/context/uir";
import { DbDocumentType } from "../helper/constants";

export function getContextAndType(type: DbDocumentType): { context: string; requirementType: string; format: string } {
  switch (type) {
    case DbDocumentType.BRD:
      return {
        context: BRD_CONTEXT,
        requirementType: 'Business Requirements',
        format: '{"title": <title>, "requirement": <requirement>}'
      };
    case DbDocumentType.PRD:
      return {
        context: PRD_CONTEXT,
        requirementType: 'Product Requirements',
        format: '{"title": <title>, "requirement": "<requirement>  \\n#### Screens:  \\n<Screen Description>  \\n#### Personas:  \\n<Persona Description>"}'
      };
    case DbDocumentType.NFR:
      return {
        context: NFR_CONTEXT,
        requirementType: 'Non-Functional Requirements',
        format: '{"title": <title>, "requirement": <requirement>}'
      };
    case DbDocumentType.UIR:
      return {
        context: UIR_CONTEXT,
        requirementType: 'User Interface Requirements',
        format: '{"title": <title>, "requirement": <requirement>}'
      };
    case DbDocumentType.BP:
      return {
        context: BP_CONTEXT,
        requirementType: 'Business Process Flow',
        format: '{"title": <title>, "requirement": <requirement>}'
      };
    default:
      return {
        context: '',
        requirementType: 'Requirements',
        format: '{"title": <title>, "requirement": <requirement>}'
      }
  }
}