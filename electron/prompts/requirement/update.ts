import { MARKDOWN_RULES } from '../context/markdown-rules';
import { getContextAndType } from '../../utils/get-context';
import { IRequirementEnhance } from '../../schema/solution.schema';

export function updateRequirementPrompt(promptParams: IRequirementEnhance): string {
  const { solutionName, solutionDescription, fileContent, linkedDocuments, documentData: { name, description, jiraId, documentTypeId } } = promptParams;
  const { context, requirementType, format } = getContextAndType(documentTypeId);

  const fileContentSection = fileContent ? `\nFileContent: ${fileContent}` : '';

  return `You are a requirements analyst tasked with extracting detailed ${requirementType} from the provided app description. Below is the description of the app:

App Name: ${solutionName}
App Description: ${solutionDescription}

Here is the existing requirement:
${description}

Client Request:
${name}
${fileContentSection}

${buildBRDContextForPRD(linkedDocuments)}

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


const buildBRDContextForPRD = (additionalDocuments: IRequirementEnhance["linkedDocuments"])=>{
  if(!additionalDocuments || additionalDocuments.length == 0) return '';

  return `### Business Requirement Documents
  Please consider the following Business Requirements when updating the requirement:
  ${additionalDocuments.map(doc=>
`BRD Title: ${doc.title}
BRD Requirement: ${doc.requirement}\n`)}` + '\n';
}