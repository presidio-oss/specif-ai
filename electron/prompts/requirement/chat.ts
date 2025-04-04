import { getContextAndType } from "../../utils/get-context";

interface ChatUpdateRequirementParams {
  name: string;
  description: string;
  type: string;
  requirement: string;
  userMessage: string;
  requirementAbbr: 'BRD' | 'PRD' | 'UIR' | 'NFR' | 'BP';
  brds?: Array<{
    id: string;
    title: string;
    requirement: string;
  }>;
}

export function chatUpdateRequirementPrompt(params: ChatUpdateRequirementParams): string {
  const {
    name,
    description,
    type,
    requirement,
    userMessage,
    requirementAbbr,
  } = params;

  const { context, requirementType } = getContextAndType(requirementAbbr);
  return `You are a requirements analyst tasked to assist users in refining and enhancing their existing ${type} by gathering detailed input, providing expert advice, and suggesting improvements. Do not provide technical implementation details or code snippets and ensure your response is not in markdown format.
App Details:
App Name: ${name}
App Description: ${description}
${type}: ${requirement}

Base Context:
${context}

${buildContextForRequirementType(params)}

User Message:
${userMessage}

-----------
Maintain a professional and ${type} tone.
DON'T INCLUDE the same content of ${type} in the response.
Ensure your suggestions are practical, relevant to the user's specific context that aligns with attached ${type} and Base Context.

RESPONSE FORMAT
Provide a precise, single-paragraph answer that is detailed and directly addresses the user's context. Avoid any prefix labels (e.g., "To enhance the existing requirement..."). The response must:
- Be plain text only, without any markdown formatting (e.g., no #, ##, *, -, \`\`\`\`, etc.).
- Exclude all code snippets, pseudo-code, or technical implementation details.
- Be concise, professional, and relevant to the user's specific context.

Strictly Prohibited:
- ABSOLUTELY NO CODE SNIPPETS OR PSEUDO-CODE
- NO TECHNICAL IMPLEMENTATION DETAILS WHATSOEVER
- NO MENTION OF SPECIFIC PROGRAMMING LANGUAGES, FRAMEWORKS, LIBRARIES, OR TOOLS
- NO ARCHITECTURAL PATTERNS OR API SPECIFICATIONS
- NO DATABASE DESIGNS OR TECHNICAL TERMINOLOGY
- DO NOT MENTION HOW THIS WOULD BE HELPFUL TO THE USER
- NO STEP-BY-STEP TECHNICAL INSTRUCTIONS
- NO MARKDOWN FORMATTING (e.g., no #, ##, *, -, \`\`\`\`, etc.)

Output Structure MUST be a valid JSON with this format:
{
  "response": "Your detailed response here"
}

The output MUST be a valid JSON object strictly adhering to the structure defined above.
Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}

const buildContextForRequirementType = (params: ChatUpdateRequirementParams) => {
  switch (params.requirementAbbr) {
    case "PRD": {
      return buildProductRequirementContext(params.brds)
    }
    default: {
      return '';
    }
  }
}

const buildProductRequirementContext = (brds: ChatUpdateRequirementParams['brds'] = []) => {
  if (!brds || brds.length === 0) return "";

  return `The above provided product requirement is linked to the following business requirement documents by product managers.
Consider these when responding to the user.

## Business Requirement Documents

${brds.map((brd) =>
  `BRD Id: ${brd.id}
BRD Title: ${brd.title}
BRD Requirement: ${brd.requirement}`.trim()).join('\n\n')}`;
};
