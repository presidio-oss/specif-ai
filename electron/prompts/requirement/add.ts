import { MARKDOWN_RULES } from '../context/markdown-rules';
import { getContextAndType } from '../../utils/get-context';
import { IRequirementEnhance } from '../../schema/solution.schema';

export function addRequirementPrompt(promptParams: IRequirementEnhance): string {
  const { solutionName, solutionDescription, fileContent, linkedDocuments, documentData: { name, description, documentTypeId } } = promptParams;

  const { context, requirementType, format } = getContextAndType(documentTypeId);

  const fileContentSection = fileContent ? `\nFileContent: ${fileContent}` : '';

  return `You are a requirements analyst tasked with extracting detailed ${requirementType} from the provided app description. Below is the description of the app:

App Name: ${solutionName}
App Description: ${solutionDescription}

Client Request: ${description}
${fileContentSection}

${buildBRDContextForPRD(linkedDocuments)}

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

const buildBRDContextForPRD = (brds: IRequirementEnhance["linkedDocuments"])=>{
  if(!brds || brds.length == 0) return '';

  return `### Business Requirement Documents
  Please consider the following Business Requirements when updating the requirement:
  ${brds.map(brd=>
`BRD Title: ${brd.title}
BRD Requirement: ${brd.requirement}\n`)}` + '\n';
}