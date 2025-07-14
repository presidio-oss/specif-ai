import { HumanMessage } from "@langchain/core/messages";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { WorkflowEventsService } from "../../services/events/workflow-events.service";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildReactAgent } from "../react-agent";
import { IUseCaseWorkflowStateAnnotation } from "./state";
import { UseCaseWorkflowRunnableConfig } from "./types";
import { getUCPrompt } from "../../prompts/core/usecase";

const workflowEvents = new WorkflowEventsService("usecase");

type BuildResearchNodeParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const buildResearchNode = ({
  model,
  tools,
  checkpointer,
}: BuildResearchNodeParams) => {
  return async (
    state: IUseCaseWorkflowStateAnnotation["State"],
    runnableConfig: UseCaseWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } = runnableConfig.configurable ?? {};
    const span = trace?.span({ name: "research" });

    if (tools.length === 0) {
      span?.end({ statusMessage: "No tools are passed so skipping research phase" });
      await workflowEvents.dispatchAction(
        "research",
        { title: "Skipped research phase - no tools were available" },
        runnableConfig
      );
      return { referenceInformation: "" };
    }

    const researchCorrelationId = uuid();
    await workflowEvents.dispatchThinking(
      "research",
      { title: "Researching based on business proposal context" },
      runnableConfig,
      researchCorrelationId
    );

    const agent = buildReactAgent({
      model: model,
      tools: tools,
      responseFormat: {
        prompt: `Summarize your research findings about the business proposal. Focus on industry trends, competitor strategies, and market opportunities that could inform the business proposal.`,
        schema: z.object({
          referenceInformation: z.string(),
        }),
      },
      checkpointer: checkpointer,
    });

    const recursionLimit = Math.min(Math.max(64, tools.length * 2 * 3 + 1), 128);

    const researchUrls = state.requirement?.researchUrls || [];
    const hasResearchUrls = Array.isArray(researchUrls) && researchUrls.length > 0;
    
    let researchPrompt = `You are a research assistant. Your task is to extract and summarize information from URLs.

Project: ${state.project.name}
Description: ${state.project.description}

${state.requirement?.description ? `Requirement: ${state.requirement.description}` : ""}`;

    if (hasResearchUrls) {
      researchPrompt += `\n\nHere are the URLs to scrape content from:\n`;
      researchUrls.forEach((url: string, index: number) => {
        researchPrompt += `${index + 1}. ${url}\n`;
      });
      
      researchPrompt += `\nUse the fetch_url_content tool to extract content from each URL. Then summarize the key information from these sources.`;
    } else {
      researchPrompt += `\n\nNo URLs were provided. Please provide a brief summary of the project based on the information above.`;
    }

    researchPrompt += `\n\nDO NOT ask for more information or URLs. Simply use the fetch_url_content tool on each URL provided and summarize what you find.`;

    const response = await agent.invoke(
      { messages: [new HumanMessage(researchPrompt)] },
      {
        recursionLimit: recursionLimit,
        configurable: {
          trace: span,
          thread_id: runnableConfig.configurable?.thread_id,
          sendMessagesInTelemetry: sendMessagesInTelemetry
        },
        signal: runnableConfig.signal,
      }
    );

    let referenceInformation = response.structuredResponse.referenceInformation;
    
    if (referenceInformation.includes('Could you please provide') || 
        referenceInformation.includes('please provide') ||
        referenceInformation.includes('need more information') ||
        referenceInformation.includes('need additional information')) {
      
      const usefulParts = referenceInformation
        .replace(/Could you please provide.*$/gm, '')
        .replace(/Please provide.*$/gm, '')
        .replace(/I need more information.*$/gm, '')
        .replace(/I need additional information.*$/gm, '')
        .trim();
      
      if (usefulParts.length > 100) {
        referenceInformation = usefulParts;
      } else {
        referenceInformation = `Based on the available information about ${state.requirement?.title || state.project.description}, please proceed with generating a comprehensive business proposal.`;
      }
    }
    
    await workflowEvents.dispatchAction(
      "research",
      {
        title: "Research completed and prepared summary for strategic initiative generation",
        output: referenceInformation,
      },
      runnableConfig,
      researchCorrelationId
    );

    span?.end({ statusMessage: "Research completed successfully!" });
    return { referenceInformation };
  };
};

type BuildGenerationNodeParams = {
  model: LangChainModelProvider;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const buildUseCaseGenerationNode = ({
  model,
  checkpointer,
}: BuildGenerationNodeParams) => {
  return async (
    state: IUseCaseWorkflowStateAnnotation["State"],
    runnableConfig: UseCaseWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } = runnableConfig.configurable ?? {};
    const span = trace?.span({ name: "generate-usecase" });

    try {
      const useCaseGenerationCorrelationId = uuid();
      await workflowEvents.dispatchThinking(
        "usecase-generation",
        { title: "Generating Strategic Initiative Proposal" },
        runnableConfig,
        useCaseGenerationCorrelationId
      );

      const agent = buildReactAgent({
        model: model,
        tools: [],
        responseFormat: {
          prompt: `You are a Business Development Consultant. Generate a comprehensive business proposal based on the project information and research findings.
          
          IMPORTANT: DO NOT ASK QUESTIONS. Instead, make reasonable assumptions based on the information provided and generate a complete draft.
          
          The proposal should be well-structured, professional, and ready for presentation to stakeholders.
          
          Include the following sections:
          1. Title: A concise, descriptive title for the business proposal (DO NOT include terms like "SI", "Strategic Initiative", or any reference to this being a strategic initiative in the title)
          2. Summary: A one-sentence summary of the business case
          3. Goals and Business Outcomes: Tangible, measurable goals and clear business outcomes
          4. Strategic Approaches: At least 3 approaches, each detailing HOW (implementation strategy), WHO (key stakeholders), WHEN (timeline), INVESTMENT (costs), and ratings for complexity and sustainability
          5. Competitor Analysis: Supporting case studies of similar companies
          6. Potential Challenges: Identification of gaps or risks
          7. Innovation Opportunities: How this approach could position the organization as an innovation leader
          
          MARKDOWN FORMATTING INSTRUCTIONS:
          - Use consistent heading levels: # for title, ## for main sections, ### for subsections
          - DO NOT use # for the entire document content
          - Use bullet points (- ) for lists
          - Use bold (**text**) for emphasis on important points
          - Use tables for comparing approaches or options
          - Keep paragraphs concise (3-5 sentences)
          - Use horizontal rules (---) sparingly to separate major sections
          - Ensure proper spacing between sections (one blank line)
          - Format is critical as this document may be exported to Word
          
          CRITICAL JSON FORMATTING INSTRUCTIONS:
          - Your response MUST be valid JSON that can be parsed by JSON.parse()
          - For the 'requirement' field, ensure all markdown content is properly escaped as a JSON string
          - Do NOT include markdown code block markers like \`\`\`markdown or \`\`\` in your response
          - Do NOT include any explanations outside the JSON structure
          - Ensure all quotes within the content are properly escaped with backslashes
          - The response should be ONLY the JSON object with 'title' and 'requirement' fields
          
          Make the content specific, actionable, and focused on business value.`,
          schema: z.object({
            title: z.string().describe("A concise, descriptive title for the business proposal (without mentioning 'SI' or 'strategic initiative')"),
            requirement: z.string().describe("The complete business proposal content in properly escaped JSON string format"),
          }),
        },
        checkpointer: checkpointer,
      });

      const ucParams = {
        project: state.project,
        requirement: state.requirement,
        requestId: uuid(),
        requirementAbbr: "SI" as const
      };

      const prompt = getUCPrompt(ucParams);
      
      const response = await agent.invoke(
        {
          messages: [
            new HumanMessage(`${prompt}
            
Here is additional research information that may be helpful:
${state.referenceInformation}

Solution Information:
- Name: ${state.project.solution.name}
- Description: ${state.project.solution.description}
- Technical Details: ${state.project.solution.techDetails}

IMPORTANT: Generate a comprehensive business proposal. DO NOT ask questions or request additional information. Make reasonable assumptions based on the information provided and generate a complete draft that is ready for presentation to stakeholders.

TITLE INSTRUCTIONS:
- Create a concise, descriptive title for the business proposal
- DO NOT include terms like "SI", "Strategic Initiative", or any reference to this being a strategic initiative in the title
- The title should focus on the business value or solution being proposed

MARKDOWN FORMATTING INSTRUCTIONS:
- Use consistent heading levels: # for title, ## for main sections, ### for subsections
- DO NOT use # for the entire document content
- Use bullet points (- ) for lists
- Use bold (**text**) for emphasis on important points
- Use tables for comparing approaches or options
- Keep paragraphs concise (3-5 sentences)
- Use horizontal rules (---) sparingly to separate major sections
- Ensure proper spacing between sections (one blank line)
- Format is critical as this document may be exported to Word

CRITICAL JSON FORMATTING INSTRUCTIONS:
- Your response MUST be valid JSON that can be parsed by JSON.parse()
- For the 'requirement' field, ensure all markdown content is properly escaped as a JSON string
- Do NOT include markdown code block markers like \`\`\`markdown or \`\`\` in your response
- Do NOT include any explanations outside the JSON structure
- Ensure all quotes within the content are properly escaped with backslashes
- The response should be ONLY the JSON object with 'title' and 'requirement' fields`),
          ],
        },
        {
          configurable: {
            trace: span,
            thread_id: runnableConfig.configurable?.thread_id,
            sendMessagesInTelemetry: sendMessagesInTelemetry
          },
          signal: runnableConfig.signal,
        }
      );

      await workflowEvents.dispatchAction(
        "usecase-generation",
        {
          title: "Strategic Initiative Proposal generated successfully",
          output: {
            title: response.structuredResponse.title,
            requirement: response.structuredResponse.requirement,
          }
        },
        runnableConfig,
        useCaseGenerationCorrelationId
      );

      span?.end({ statusMessage: "Successfully generated strategic initiative proposal" });
      return {
        useCaseDraft: {
          title: response.structuredResponse.title,
          requirement: response.structuredResponse.requirement,
        },
      };
    } catch (error) {
      span?.end({ level: "ERROR" });
      return {
        useCaseDraft: {
          title: state.requirement?.title || "Error generating strategic initiative",
          requirement: `Error generating strategic initiative proposal: ${error}`,
        },
      };
    }
  };
};
