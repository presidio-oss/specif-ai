export const toolUseContext = ({
  recursionLimit,
}: {
  recursionLimit?: number;
}) => `You will have access to set of tools which you can use to gather relevant and necessary information. The following are the tool calling guidelines
    - Do not limit yourself to a single tool; consider all options that might provide relevant information.
    - Each tool use should have a clear intent and expected value. Know what you are looking for before using a tool.
    - Build on previously gathered information. Use insights from earlier tool interactions to guide subsequent research.
    - Avoid redundant queries. Do not repeat searches for the same information using the same tool unless there's a specific reason to believe the results might have changed.
    - VERY IMPORTANT - Crucially, your interaction with all tools MUST be strictly limited to retrieving information.
      UNDER NO CIRCUMSTANCES should you use any tool to write to, modify, or create any external files, databases, or other resources.
      Your sole purpose is to gather information for the downstream requirement generation agents.
    ${
      recursionLimit != undefined
        ? `- You have a limited number of attempts - ${recursionLimit} - consider this a guideline to encourage efficiency for making tool calls. Use them judiciously to gather the most valuable information.`
        : ""
    }
    - Before fixating on a single tool, consider exploring related tools that might provide complementary information or a different perspective.
    - Think strategically about whether you can use tools in combination to answer your questions more efficiently and reduce the total number of calls needed.
    - Avoid relying too heavily on information from a single tool. Diversify your sources to get a more well-rounded understanding.
    - If a tool returns an error, carefully analyze the error message. Understand why the tool might have failed.
    - If you continuously face errors with a particular tool, consider switching to alternative tools or approaches. Do not persist with a tool that is consistently failing.
    - If you do not utilize any tools to gather further information, the control will automatically move to the next stage in the workflow.
      Therefore, it is crucial that you actively use tool calls to ensure thorough research within the given constraints.
    - Avoid making excessive tool calls without clear benefit.`;
