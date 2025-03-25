import { MARKDOWN_RULES } from '../context/markdown-rules';
import { getContextAndType } from '../../utils/get-context';

interface UpdateRequirementParams {
  name: string;
  description: string;
  existingReqt: string;
  updatedReqt: string;
  fileContent?: string;
  reqId: string;
  addReqtType: 'BRD' | 'PRD' | 'UIR' | 'NFR' | 'BP';
}

export function updateRequirementPrompt({
  name,
  description,
  existingReqt,
  updatedReqt,
  fileContent,
  reqId,
  addReqtType
}: UpdateRequirementParams): string {
  const { context, requirementType, format } = getContextAndType(addReqtType);

  const fileContentSection = fileContent ? `\nFileContent: ${fileContent}` : '';

  return `You are a requirements analyst tasked with extracting detailed ${requirementType} from the provided app description. Below is the description of the app:

App Name: ${name}
App Description: ${description}

Here is the existing requirement:
${existingReqt}

Client Request:
${updatedReqt}
${fileContentSection}

Context:
${context}

Based on the above context, update the existing requirement by incorporating the client's requests and the information from the provided file content. Strictly don't eliminate the content given by the client. Instead groom and expand it.
Keep the responses very concise and to the point.

Output Structure MUST be a valid JSON: Here is the sample Structure:
{
  "updated": ${format}
}

Special Instructions:
(!) You are allowed to use Markdown for the updated requirement description. You MUST ONLY use valid Markdown according to the following rules:
${MARKDOWN_RULES}
(!) The output MUST be a valid JSON object strictly adhering to the structure defined above. Failure to produce valid JSON will cause a critical application error.
    The value of the updated key MUST represent one requirement (and absolutely NOT an array of requirements)

Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}
