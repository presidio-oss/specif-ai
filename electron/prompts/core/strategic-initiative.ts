/**
 * Prompt for the response format schema of the strategic initiative generation agent
 * @returns A formatted prompt string for the agent response format
 */
export const getStrategicInitiativeResponseFormatPrompt = (): string => {
  return `You are a Business Development Consultant. Generate a comprehensive business proposal based on the project information and research findings.
          
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

Make the content specific, actionable, and focused on business value.`;
};

/**
 * Prompt for generating a strategic initiative proposal
 * @param researchInformation Research information about the project
 * @param solutionInfo Solution information details
 * @returns A formatted prompt string for strategic initiative generation
 */
export const getStrategicInitiativePrompt = (
  researchInformation: string, 
  solutionInfo: { name: string; description: string; techDetails: string }
): string => {
  return `Here is additional research information that may be helpful:
${researchInformation}

Solution Information:
- Name: ${solutionInfo.name}
- Description: ${solutionInfo.description}
- Technical Details: ${solutionInfo.techDetails}

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
- The response should be ONLY the JSON object with 'title' and 'requirement' fields`;
};

/**
 * Prompt for researching information from URLs for strategic initiative
 * @param project Project information
 * @param requirement Requirement details
 * @param researchUrls URLs to research from
 * @returns A formatted prompt string for research
 */
export const getResearchPrompt = (
  project: { name: string; description: string },
  requirement?: { description?: string; researchUrls?: string[] }
): string => {
  const researchUrls = requirement?.researchUrls || [];
  const hasResearchUrls = Array.isArray(researchUrls) && researchUrls.length > 0;
  
  let prompt = `You are a research assistant. Your task is to extract and summarize information from URLs.

Project: ${project.name}
Description: ${project.description}

${requirement?.description ? `Requirement: ${requirement.description}` : ""}`;

  if (hasResearchUrls) {
    prompt += `\n\nHere are the URLs to scrape content from:\n`;
    researchUrls.forEach((url: string, index: number) => {
      prompt += `${index + 1}. ${url}\n`;
    });
    
    prompt += `\nUse the fetch_url_content tool to extract content from each URL. Then summarize the key information from these sources.`;
  } else {
    prompt += `\n\nNo URLs were provided. Please provide a brief summary of the project based on the information above.`;
  }

  prompt += `\n\nDO NOT ask for more information or URLs. Simply use the fetch_url_content tool on each URL provided and summarize what you find.`;
  
  return prompt;
};

/**
 * Prompt for summarizing research findings
 * @returns A formatted prompt string for summarizing research findings
 */
export const getResearchSummaryPrompt = (): string => {
  return `Summarize your research findings about the business proposal. Focus on industry trends, competitor strategies, and market opportunities that could inform the business proposal.`;
};
