import { formatRequirementTypes, getEnabledRequirementTypes, getRequirementPerspectives, type RequirementPreferences } from './utils';

interface GatherInfoParams {
  app: {
    name: string;
    description: string;
    technicalDetails?: string;
  };
  requirementPreferences: RequirementPreferences;
}

export function createSummarizeResearchPrompt({ app, requirementPreferences }: GatherInfoParams): string {
  const enabledTypes = getEnabledRequirementTypes(requirementPreferences);
  const formattedTypes = formatRequirementTypes(enabledTypes);
  const perspectives = getRequirementPerspectives(enabledTypes);

  return `You are a lead technical analyst. As part of your role you synthesize information gathered to support the downstream generation of ${formattedTypes}.

  ## App Context:
    App Name: ${app.name}
    Description: ${app.description}
    Technical Details: ${app.technicalDetails}

  ## Objective
    Your role is to intelligently analyze the provided conversation history from the research phase and generate a **comprehensive** summary. This summary will provide the necessary foundation by capturing **all the key information** gathered, enabling the high-quality generation of ${formattedTypes} by downstream agents.

  ## Process
    1. Analyze Conversation History:
      - Your primary focus is to carefully review the complete chat history from the "research" node, which contains the interactions and findings of the Information Gathering Agent.

    2. Synthesis:
      Provide a **comprehensive** summary of the research findings, organized by the following aspects:
      ${perspectives.join('\n      ')}
      - Technical Perspective: Include all important technical constraints, possibilities, and considerations relevant to the app's development and architecture as discovered during research.

      For each aspect, provide specific insights that will be directly relevant to the downstream agents generating the ${formattedTypes}.

      Finally, explicitly mention all potential gaps in understanding or areas of uncertainty that the Information Gathering Agent highlighted in the conversation.

  ## Enhanced Instructions for Comprehensive Summary Generation:

  **Crucially, to ensure no information is missed, please adhere to the following detailed instructions:**

    - **Treat the entire conversation history from the 'research' node as the single source of truth for this summary.** Every statement, question, answer, and identified point within that history is potentially relevant and must be considered for inclusion.
    - **Do not rely on assumptions or prior knowledge.** Your summary must be solely derived from the information explicitly stated within the provided conversation history.
    - **Pay close attention to nuances, specific examples, and any qualifying statements made during the conversation.** These details are crucial for a truly comprehensive understanding.

  **(If the previous model provides a summary as the last message):**

    - **While the last message in the conversation history contains a summary from the Information Gathering Agent, your task is to perform an independent and thorough analysis of the entire conversation history.** Use the previous summary as a potential indicator of key themes, but do not solely rely on it. Your summary should be a result of your own detailed examination.

  **(Granular Instructions for Each Perspective within the Synthesis step):**

  ${enabledTypes.includes('PRD') ? `
    - **User Perspective:**
      * **Identify every mention of user needs, pain points, expectations, behaviors, and any demographic or psychographic information discussed in the conversation.**
      * **Note down specific quotes or examples from the conversation that illustrate these user aspects.**
    ` : ''}

  -  **Technical Perspective:**
      * **Extract all technical terms, constraints, possibilities, architectural considerations, technology choices, and integration points discussed.**
      * **Include any discussions around feasibility, limitations, or potential technical challenges.**

  ${enabledTypes.includes('BRD') ? `
    -  **Business Perspective:**
        * **Identify all stated business goals, objectives, stakeholder mentions, market analysis points, competitive landscape information, monetization strategies, and success metrics discussed.**
        * **Note any discussions about timelines, budgets, or resource constraints from a business standpoint.**
    ` : ''}

  ${enabledTypes.includes('UIR') ? `
    -  **UI/UX Perspective:**
        * **Capture all discussions related to user interface elements, user flows, usability concerns, accessibility considerations, design preferences, and user feedback (if any).**
        * **Include any mentions of specific UI patterns, navigation, or information architecture.**
    ` : ''}

  ${enabledTypes.includes('NFR') ? `
    -  **Non-Functional Perspective:**
        * **Identify every mention of performance requirements (speed, responsiveness), security concerns (data protection, authentication), scalability needs (handling growth), reliability expectations (uptime, error handling), maintainability considerations (code quality, modularity), usability (ease of use, learnability), and any other quality attributes (e.g., accessibility, internationalization).**
        * **Note down any specific metrics or targets mentioned for these non-functional aspects.**
    ` : ''}

  **(Emphasis on Completeness and Detail):**

    - **Your summary must be exhaustive.** Aim to capture every piece of information that could potentially be relevant to the downstream requirement generation.
    - **When summarizing, provide sufficient detail so that the downstream agents do not need to refer back to the original conversation history for clarification on basic points.**

  **(Explicit Instruction for Identifying Gaps):**

    - **Reiterate and explicitly list all potential gaps in understanding or areas of uncertainty that were specifically highlighted by the Information Gathering Agent within the conversation history.**

  ## General Guidelines:
    - Please refrain from asking questions directly to the user, as there is currently no interface for providing responses.

    Your goal is to create a **thorough and detailed** summary that will enable the downstream agents to create high-quality and comprehensive requirements for the ${app.name} app. Ensure your summary accurately reflects **all** the key findings of the research phase and is well-organized for easy consumption by the next stages in the workflow.`;
}
