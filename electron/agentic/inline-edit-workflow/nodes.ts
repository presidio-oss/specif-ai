import { HumanMessage } from "@langchain/core/messages";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { IInlineEditWorkflowStateAnnotation } from "./state";

type InlineEditWorkflowRunnableConfig = {
  configurable?: {
    trace?: any;
    thread_id?: string;
    sendMessagesInTelemetry?: boolean;
  };
};

export const buildInlineEditNode = (modelProvider: LangChainModelProvider) => {
  return async (
    state: IInlineEditWorkflowStateAnnotation["State"],
    runnableConfig: InlineEditWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig.configurable ?? {};
    const span = trace?.span({
      name: "inline-edit",
    });

    try {
      // Create a simple prompt for the AI
      const prompt = `
        I have the following text that needs to be improved:
        
        "${state.selectedText}"
        
        Instructions: ${state.userPrompt}
        
        IMPORTANT FORMATTING INSTRUCTIONS:
        - Return the improved text as properly formatted markdown
        - You can use standard markdown formatting (bold, italic, lists, etc.)
        - You can use headings if appropriate (prefer h3 or smaller - ### or more #s)
        - Do NOT include any explanations about your edits
        - Do NOT wrap the entire response in quotes or code blocks
        - Just provide the improved text with proper markdown formatting
      `;

      const generation = span?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        environment: process.env.APP_ENVIRONMENT,
        input: sendMessagesInTelemetry ? prompt : undefined,
      });

      // LLM Call
      const model = modelProvider.getChatModel();
      const response = await model.invoke(prompt);

      generation?.end({
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens,
        },
        output: sendMessagesInTelemetry ? response : undefined,
      });

      const responseText =
        typeof response === "string" ? response : response.content.toString();

      // Clean up the response text but preserve markdown formatting
      let cleanedText = responseText
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/^```.*\n|```$/gm, ''); // Remove markdown code blocks
        
      // Remove any HTML tags but preserve markdown formatting
      cleanedText = cleanedText
        .replace(/<[^>]*>/g, ''); // Remove any HTML tags
        
      // Ensure headings are h3 or smaller (### or more)
      cleanedText = cleanedText
        .replace(/^#\s+/gm, '### ') // Convert h1 to h3
        .replace(/^##\s+/gm, '### '); // Convert h2 to h3

      span?.end({
        statusMessage: "Successfully generated edited text",
      });

      return {
        editedText: cleanedText,
        isComplete: true,
        messages: [...state.messages, new HumanMessage(prompt)],
      };
    } catch (error) {
      const message = `[inline-edit-workflow] Error in inline-edit node: ${error}`;
      console.error(message, error);
      span?.end({
        level: "ERROR",
        statusMessage: message,
      });

      // Return current state to avoid breaking the workflow
      return {
        editedText: "",
        isComplete: true, // Force completion on error
      };
    }
  };
};
