import { PRD_CONTEXT } from '../context/prd';
import { MARKDOWN_RULES } from '../context/markdown-rules';

interface CreatePRDParams {
  name: string;
  description: string;
  max_count: number;
  brds?: Array<{
    id: string;
    title: string;
    requirement: string;
  }>;
  extraContext?:string;
}

export function createPRDPrompt({ name, description, max_count, brds,extraContext }: CreatePRDParams): string {
  return `You are an award winning product manager tasked with extracting detailed Product Requirements from the provided information.
## App Description:

App Name: ${name}
App Description: ${description}

${buildBusinessRequirementContext(brds)}

${PRD_CONTEXT}

${extraContext ? `### Additional Context:\n${extraContext}`:''}

Output Structure should be a valid JSON: Here is the sample Structure:

{
  "prd": [
    {
      "id": "PRD1", "title": <title> ,"requirement": "[Product Requirement in one to two lines]  \\n#### Screens:  \\n[Screen Description]  \\n#### Personas:  \\n[Persona Description], "linkedBRDIds": [Linked BRD Ids]"
    },
    {
      "id": "PRD2", "title": <title> ,"requirement": "[Product Requirement in one to two lines]  \\n#### Screens:  \\n[Screen Description]  \\n#### Personas:  \\n[Persona Description], "linkedBRDIds": [Linked BRD Ids]"
    }...
  ]
}

Special Instructions:
1. You are allowed to use Markdown for the requirement part of product requirement. You MUST ONLY use valid Markdown according to the following rules:
  ${MARKDOWN_RULES}
  - Please do no make the intro/ product requirement paragraph bold.
2. The following instructions apply specifically when Business Requirement Documents are provided in the context:
  1. When a PRD has a clear and direct relationship with one or more provided BRDs, populate the linkedBRDIds array with the corresponding BRD IDs. If a PRD addresses aspects from multiple BRDs, include all relevant BRD IDs.
  2. It is not mandatory for every PRD to be linked to a BRD; use empty array if no direct BRD relationship exists. Ensure all listed linkedBRDIds are explicitly present in the 'Business Requirement Documents' section.
  3. Ensure comprehensive coverage: When BRDs are provided, every requirement outlined in the provided BRDs must be addressed by at least one PRD. Create as many PRDs as necessary to achieve this;
     a single BRD requirement can be covered by one or more PRDs, and a single PRD can cover requirements from one or more BRDs.
  4. The linkedBRDIds array establishes a clear connection between PRDs and their originating BRDs, providing crucial context and traceability, especially when a PRD relates to multiple BRDs.
     The relationship is not strictly hierarchical.

Please ensure the requirements are descriptive and also clear, concise. Output must be valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.
Generate Product Requirements with a maximum count of ${max_count}. Sort all requirements based on business impact (High to Medium to Low).`;
}


const buildBusinessRequirementContext = (brds: CreatePRDParams["brds"] = []) => {
  if (brds.length == 0) return "";

  return `The business analysts have provided you the following business requirement documents for which
we would want to extract detailed product requirements to ensure the product is built as intended and meets business goals.

## Business Requirement Documents

${brds.map((brd) =>
  `
BRD Id: ${brd.id}
BRD Title: ${brd.title}
BRD Requirement: ${brd.requirement}\n    
    `.trim()
)}`;
};