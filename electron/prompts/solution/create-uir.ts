import { MARKDOWN_RULES } from "../context/markdown-rules";
import { UIR_CONTEXT } from "../context/uir";

interface CreateUIRParams {
  name: string;
  description: string;
  minCount: number;
  referenceInformation?: string;
}

export function createUIRPrompt({
  name,
  description,
  minCount,
  referenceInformation,
}: CreateUIRParams): string {
  return `You are a requirements analyst tasked with extracting User Interface Requirements from the provided app description. Below is the description of the app:

App Name: ${name}
App Description: ${description}

${UIR_CONTEXT}

${
  referenceInformation ? `### Additional Context:\n${referenceInformation}` : ""
}

Output Structure should be a valid JSON: Here is the sample Structure:

{
  "uir": [
    {
      "id": "UIR1", "title": <title> ,"requirement": "[User Interface Requirements]"
    },
    {
      "id": "UIR2", "title": <title> ,"requirement": "[User Interface Requirements]"
    }...
  ]
}

Special Instructions:
1. You are allowed to use Markdown for the requirement part of user interface requirement. You MUST ONLY use valid Markdown according to the following rules:
  ${MARKDOWN_RULES}

Please ensure the requirements are clear, concise, and comprehensive. Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.
Generate **${minCount}** User Interface Requirements. You may generate more if needed for clarity or completeness, but not fewer.
Sort all requirements based on business impact (High to Medium to Low).`;
}
