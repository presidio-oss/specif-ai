import { SPECIAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS } from "../../context/editor-instructions";
import { CRITICAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS } from "../../context/editor-instructions";

interface UpdateBusinessProcessPromptParams {
  name: string;
  description: string;
  existingReqt: string;
  updatedReqt: string;
  BRDS: string;
  PRDS: string;
}

export function updateBusinessProcessPrompt({
  name,
  description,
  existingReqt,
  updatedReqt,
  BRDS,
  PRDS
}: UpdateBusinessProcessPromptParams): string {
  return `You are an expert in creating detailed and efficient Business Process Flows from the provided app description. Below is the description of the app:

App Name:
${name}

App Description:
${description}

Business Process should clearly articulate the sequence of actions, decision points, and outcomes necessary to achieve the business objectives.
1. Identify Key Stakeholders
2. Define Process Phases
3. Sequence of Actions
4. Decision Points
5. Inputs and Outputs
6. Roles and Responsibilities

Here is the existing requirement:
${existingReqt}

Client Request:
${updatedReqt}

Business Requirements:
${BRDS}

Product Requirements:
${PRDS}

Update the existing Business Process Flow that effectively addresses both the client's requests and the information from the provided Business and Product Requirements. 
final_business_process_flow must be a single paragraph, not a list or json format.
Generate an apt title for final_business_process_flow. Title should be an one-liner not more than 5 words.

${CRITICAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS}

STRICT: 
(!) The business process flow MUST be based primarily on the client request description.
(!) Every sentence in the response MUST describe a distinct STEP/ ACTION within the business process flow.
(!) Response for final_business_process_flow should not contain:
  - Marketing speak
  - Phrases that are promotional or that summarize the overall purpose of the application
  - Introductory phrases like "The updated business process starts with..." or "The updated process begins with.."
  - Concluding statements about process effectiveness.
  - Benefit-oriented language describing user advantages or positive outcomes (e.g., "for easier exploration," "efficiently manage," "seamlessly connect"). Focus on objective actions and data flow only.
(!) Do not include any other flows that are not part of the client request description.
(!) Ensure each step in the generated business process is directly and demonstrably related to fulfilling the actions described in the Client Request. Eliminate any steps that are generic, implied from the app description, or not directly contributing to the Client Request's objective.
(!) Focus description ONLY on PROCESS FLOW: actions and data. EXCLUDE application properties.
(!) You are allowed to use Markdown for the requirement of the final business process flow.
(!) ${SPECIAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS}

Output Structure should be a valid JSON: Here is the sample Structure:

{
  "updated": {"title": <title>, "requirement": "<final_business_process_flow>"}
}

Business Process Flow should be strictly in string format.

Please ensure the requirements are clear, concise, and comprehensive. Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}
