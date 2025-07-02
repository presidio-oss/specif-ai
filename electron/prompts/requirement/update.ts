import { MARKDOWN_RULES } from '../context/markdown-rules';
import { getContextAndType } from '../../utils/get-context';
import { CRITICAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS } from '../context/editor-instructions';
import { SPECIAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS } from '../context/editor-instructions';

interface UpdateRequirementParams {
  name: string;
  description: string;
  existingReqt: string;
  updatedReqt: string;
  fileContent?: string;
  reqId: string;
  addReqtType: 'BRD' | 'PRD' | 'UIR' | 'NFR' | 'BP';
  brds?: Array<{
    title: string;
    requirement: string;
  }>;
}

export function updateRequirementPrompt({
  name,
  description,
  existingReqt,
  updatedReqt,
  fileContent,
  reqId,
  addReqtType,
  brds = []
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

${buildBRDContextForPRD(brds)}

Context:
${context}

Based on the above context, update the existing requirement by incorporating the client's requests and the information from the provided file content. Strictly don't eliminate the content given by the client. Instead groom and expand it.
Keep the responses very concise and to the point.

Output Structure MUST be a valid JSON: Here is the sample Structure:
{
  "updated": ${format}
}

${CRITICAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS}

Special Instructions:
(!) You are allowed to use Markdown for the updated requirement description. You MUST ONLY use valid Markdown according to the following rules:
${MARKDOWN_RULES}
(!) The output MUST be a valid JSON object strictly adhering to the structure defined above. Failure to produce valid JSON will cause a critical application error.
    The value of the updated key MUST represent one requirement (and absolutely NOT an array of requirements)
(!) ${SPECIAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS}

Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}


const buildBRDContextForPRD = (brds: UpdateRequirementParams["brds"])=>{
  if(!brds || brds.length == 0) return '';

  return `### Business Requirement Documents
  Please consider the following Business Requirements when updating the requirement:
  ${brds.map(brd=>
`BRD Title: ${brd.title}
BRD Requirement: ${brd.requirement}\n`)}` + '\n';
}