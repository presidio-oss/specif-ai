import { PRD_CONTEXT } from '../context/prd';
import { MARKDOWN_RULES } from '../context/markdown-rules';

interface CreatePRDParams {
  name: string;
  description: string;
  max_count: number;
}

export function createPRDPrompt({ name, description, max_count }: CreatePRDParams): string {
  return `You are a requirements analyst tasked with extracting detailed Product Requirements from the provided app description. Below is the description of the app:

App Name: ${name}
App Description: ${description}

${PRD_CONTEXT}

Output Structure should be a valid JSON: Here is the sample Structure:

{
  "prd": [
    {
      "id": "PRD1", "title": <title> ,"requirement": "[Product Requirement in one to two lines]  \n#### Screens:  \n[Screen Description]  \n#### Personas:  \n[Persona Description]"
    },
    {
      "id": "PRD2", "title": <title> ,"requirement": "[Product Requirement in one to two lines]  \n#### Screens:  \n[Screen Description]  \n#### Personas:  \n[Persona Description]"
    }...
  ]
}

Special Instructions:
1. You are allowed to use Markdown for the requirement part of product requirement. You MUST ONLY use valid Markdown according to the following rules:
  ${MARKDOWN_RULES}
  - Please do no make the intro/ product requirement paragraph bold.

Please ensure the requirements are descriptive and also clear, concise. Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.
Generate Product Requirements with a maximum count of ${max_count}. Sort all requirements based on business impact (High to Medium to Low).`;
}
