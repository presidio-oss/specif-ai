import { HumanMessage } from "@langchain/core/messages";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { getInlineEditPrompt } from "../../prompts/core/inline-edit";
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
      const prompt = getInlineEditPrompt(state.selectedText, state.userPrompt);

      const generation = span?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        environment: process.env.APP_ENVIRONMENT,
        input: sendMessagesInTelemetry ? prompt : undefined,
      });

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

      let cleanedText = responseText
        .replace(/^["']|["']$/g, '')
        .replace(/^```.*\n|```$/gm, '');
        
      cleanedText = cleanedText
        .replace(/<[^>]*>/g, '');

      span?.end({
        statusMessage: "Successfully generated edited text",
      });

      return {
        editedText: cleanedText,
        isComplete: true,
        messages: [...state.messages, new HumanMessage(prompt)],
      };
    } catch (error) {
      span?.end({
        level: "ERROR",
        statusMessage: "Error in inline-edit node",
      });

      return {
        editedText: "",
        isComplete: true,
      };
    }
  };
};
