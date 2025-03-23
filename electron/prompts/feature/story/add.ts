import { MARKDOWN_RULES } from '../../context/markdown-rules';
import { USER_STORY } from '../../context/user-story';

export interface AddUserStoryPromptParams {
  name: string;
  description: string;
  reqDesc: string;
  featureId: string;
  featureRequest: string;
  fileContent: string;
}

export function addUserStoryPrompt(params: AddUserStoryPromptParams): string {
  return `You are a senior architect tasked with extracting detailed feature for the provided app from the User Story description provided by client. Below is the description of the app and inputs from client:
App Name:
${params.name}

App Description:
${params.description}

Requirement type: Product Requirement
${params.reqDesc}

User Story Id:
${params.featureId}

Client Request - User Story Description:
${params.featureRequest}

FileContent:
${params.fileContent}

${USER_STORY}

Output Structure should be a valid JSON: Here is the sample Structure. Follow this exactly. Do not add or change the response JSON:
# RESPONSE FORMAT EXAMPLE
{
    "features": [
        {
            "id": "<featureId>"
            "<feature name>": "[description of feature]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the feature as sentences]"
        }
    ]
}
        ...

Special Instruction:
1. id returned in the response should be same id sent to you (User Story Id -> <featureId> in json response)
2. Strictly return ONLY ONE OBJECT in the response features array.
3. You are allowed to use Markdown for the description of the feature. You MUST ONLY use valid Markdown according to the following rules:
    ${MARKDOWN_RULES}

STRICT:
(!) return a list of features ONLY: no other headers, footers, or additional text
Please ensure the feature name and description are clear, concise, and comprehensive. Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}
