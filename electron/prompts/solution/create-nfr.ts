import { NFR_CONTEXT } from '../context/nfr';
import { MARKDOWN_RULES } from '../context/markdown-rules';

interface CreateNFRParams {
  name: string;
  description: string;
  maxCount: number;
  referenceInformation?: string;
}

export function createNFRPrompt({ name, description, maxCount, referenceInformation }: CreateNFRParams): string {
  return `You are a requirements analyst tasked with extracting detailed Non-Functional Requirements from the provided app description. Below is the description of the app:

App Name: ${name}
App Description: ${description}

${NFR_CONTEXT}

${referenceInformation ? `### Additional Context:\n${referenceInformation}`:''}

Output Structure should be a valid JSON: Here is the sample Structure:

{
  "nfr": [
    {
      "id": "NFR1", "title": <title> ,"requirement": "[Non-Functional Requirements]"
    },
    {
      "id": "NFR2", "title": <title> ,"requirement": "[Non-Functional Requirements]"
    }...
  ]
}

Special Instructions:
1. You are allowed to use Markdown for the requirement part of non-functional requirement. You MUST ONLY use valid Markdown according to the following rules:
  ${MARKDOWN_RULES}

Please ensure the requirements are clear, concise, and comprehensive. Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.
Generate Non-Functional Requirements with a maximum count of ${maxCount}. Sort all requirements based on business impact (High to Medium to Low).`;
}
