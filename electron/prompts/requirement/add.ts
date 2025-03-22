import { MARKDOWN_RULES } from '../context/markdown-rules';
import { getContextAndType } from '../../utils/get-context';

interface AddRequirementParams {
  name: string;
  description: string;
  newReqt: string;
  fileContent?: string;
  addReqtType: 'BRD' | 'PRD' | 'UIR' | 'NFR';
}

export function addRequirementPrompt({
  name,
  description,
  newReqt,
  fileContent,
  addReqtType
}: AddRequirementParams): string {
  const { context, requirementType, format } = getContextAndType(addReqtType);

  const fileContentSection = fileContent ? `\nFileContent: ${fileContent}` : '';

  return `You are a requirements analyst tasked with extracting detailed ${requirementType} from the provided app description. Below is the description of the app:

App Name: ${name}
App Description: ${description}

Client Request: ${newReqt}
${fileContentSection}

Context:
${context}

Based on the above context create a one apt requirement justifies the Client Request

Output Structure should be a valid JSON: Here is the sample Structure. Follow this exactly. Don't add or change the response JSON:
{
  "LLMreqt": ${format}
}

Special Instructions:
1. You are allowed to use for the new requirement. You MUST ONLY use valid Markdown according to the following rules:
${MARKDOWN_RULES}

Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}
