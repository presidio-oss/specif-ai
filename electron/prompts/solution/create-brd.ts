import { BRD_CONTEXT } from '../context/brd';
import { MARKDOWN_RULES } from '../context/markdown-rules';

interface CreateBRDParams {
  name: string;
  description: string;
  minCount: number;
  referenceInformation?: string;
}

export function createBRDPrompt({ name, description, minCount, referenceInformation }: CreateBRDParams): string {
  return `You are a requirements analyst tasked with extracting detailed Business Requirements from the provided app description.

Below is the description of the app:
App Name: ${name}
App Description: ${description}

${BRD_CONTEXT}

${referenceInformation ? `### Additional Context:\n${referenceInformation}`:''}

Output Structure should be a valid JSON: Here is the sample Structure:

{
  "brd": [{
      "id": "BRD1", "title": [Title] ,"requirement": "[Provide the Requirement in a single paragraph. Combine all subsections within the same paragraph]"
    }, {
      "id": "BRD2", "title": [Title] ,"requirement": "[Provide the Requirement in a single paragraph. Combine all subsections within the same paragraph]"
    },
    ...
  ]
}

Special Instructions:
1. You are allowed to use Markdown for the requirement part of business requirement. You MUST ONLY use valid Markdown according to the following rules:
  ${MARKDOWN_RULES}

Please ensure the requirements are clear and comprehensive. Output only valid JSON. Do not include \`\`\`json \`\`\` on the start and end of the response.
Generate **at least ${minCount}** business requirements. You may generate more if needed for clarity or completeness, but not fewer.
Sort all requirements based on business impact (High to Medium to Low).`;
}
