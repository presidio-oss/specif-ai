import { IpcMainInvokeEvent } from "electron";
import { generateImprovedSuggestionsPrompt } from "../../prompts/core/improved-suggestions";
import { chatUserStoryTaskPrompt } from "../../prompts/feature/story/chat";
import { chatUpdateRequirementPrompt } from "../../prompts/requirement/chat";
import { buildLLMHandler } from "../../services/llm";
import { store } from "../../services/store";
import { LLMUtils } from "../../services/llm/llm-utils";
import { repairJSON } from "../../utils/custom-json-parser";
import { CHAT_INTENT, OPERATIONS, USER_TYPE } from "../../helper/constants";
import { traceBuilder } from "../../utils/trace-builder";
import {
  chatRequirementUpdateSchema,
  chatStoryTaskUpdateSchema,
  chatSuggestionSchema,
  getChatHistorySchema,
} from "../../schema/chat.schema";
import { solutionFactory } from "../../db/solution.factory";

export class AIChatController {
  static async getSuggestions(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <AIChatController.getSuggestions>");

    try {
      const llmConfig = this.validateLLMConfig();

      const validatedData = chatSuggestionSchema.parse(data);
      console.log("[get-suggestions] Using LLM config:", llmConfig);

      const {
        name,
        description,
        type,
        requirement,
        requirementAbbr,
        suggestions,
        selectedSuggestion,
        knowledgeBase,
        bedrockConfig,
        brds,
      } = validatedData;

      let prompt = generateImprovedSuggestionsPrompt({
        name,
        description,
        type,
        requirement,
        suggestions,
        selectedSuggestion,
        knowledgeBase,
        requirementAbbr,
        brds,
      });

      // Apply knowledge base constraint if provided
      if (knowledgeBase) {
        console.log("[get-suggestions] Applying knowledge base constraint...");
        if (!bedrockConfig) {
          throw new Error(
            "Bedrock configuration is required when using knowledge base"
          );
        }

        prompt = await LLMUtils.generateKnowledgeBasePromptConstraint(
          knowledgeBase,
          prompt,
          bedrockConfig
        );
      }

      console.log("[get-suggestions] Preparing messages for LLM...");
      const messages = await LLMUtils.prepareMessages(prompt);

      const handler = buildLLMHandler(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      );

      const traceName = traceBuilder(requirementAbbr, OPERATIONS.SUGGEST);
      const response = await handler.invoke(messages, null, traceName);

      return this.parseJsonResponse(response, "[get-suggestions]");
    } catch (error) {
      console.error("Error in getSuggestions:", error);
      throw error;
    } finally {
      console.log("Exited <AIChatController.getSuggestions>");
    }
  }

  static async getChatHistory(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <AIChatController.getChatHistory>");

    const validatedData = getChatHistorySchema.parse(data);

    const repo = await solutionFactory.getRepository(validatedData.solutionId);
    const conversation = await repo.getConversationByDocumentId(
      validatedData.documentId
    );

    if (!conversation) {
      return [];
    }

    const messages = await repo.getConversationMessages(conversation.id);

    console.log("Exited <AIChatController.getChatHistory>");
    return messages.map((msg) => ({
      role: msg.userType,
      content: msg.message,
    }));
  }

  static async chat(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <AIChatController.chat>");

    try {
      const llmConfig = this.validateLLMConfig();

      const { prompt, validatedData, traceName } = await this.prepareChatPrompt(
        data
      );

      // Prepare messages and invoke LLM
      const messages = await LLMUtils.prepareMessages(
        prompt,
        validatedData.chatHistory
      );

      const handler = buildLLMHandler(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      );

      const response = await handler.invoke(messages, null, traceName);
      console.log("[chat] LLM Response:", response);

      // Process response
      let processedResponse = response;

      if (data.chatIntent === CHAT_INTENT.REQUIREMENT_UPDATE) {
        try {
          const parsedResponse = this.parseJsonResponse(response, "[chat]");
          if (!parsedResponse.response) {
            throw new Error("Invalid response structure");
          }
          processedResponse = parsedResponse.response;
        } catch (error) {
          console.error("[chat] Error parsing LLM response:", error);
          throw new Error("Failed to parse LLM response as JSON");
        }
      }

      // Save conversation and return response
      await this.saveConversation(
        validatedData.solutionId,
        validatedData.documentId,
        validatedData.userMessage,
        processedResponse
      );

      return { response: processedResponse };
    } catch (error) {
      console.error("Error in chat:", error);
      throw error;
    } finally {
      console.log("Exited <AIChatController.chat>");
    }
  }

  /**
   * Validates that LLM configuration exists
   * @returns Valid LLM configuration
   * @throws Error if configuration is not found
   */
  private static validateLLMConfig(): any {
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error("LLM configuration not found");
    }
    return llmConfig;
  }

  /**
   * Prepares chat prompt based on the specified intent
   * @param data Chat request data
   * @returns Prepared prompt, validated data, and trace name
   * @throws Error for invalid chat intent
   */
  private static async prepareChatPrompt(data: any): Promise<{
    prompt: string;
    validatedData: any;
    traceName: string;
  }> {
    let validatedData;
    let prompt;
    let traceName;

    switch (data.chatIntent) {
      case CHAT_INTENT.STORY_TASK_UPDATE:
        validatedData = chatStoryTaskUpdateSchema.parse(data);
        prompt = chatUserStoryTaskPrompt({
          name: validatedData.name,
          description: validatedData.description,
          type: validatedData.type,
          requirement: validatedData.requirement,
          prd: validatedData.prd,
          us: validatedData.us,
        });
        traceName = traceBuilder(validatedData.type.trim(), OPERATIONS.CHAT);
        break;

      case CHAT_INTENT.REQUIREMENT_UPDATE:
        validatedData = chatRequirementUpdateSchema.parse(data);
        prompt = chatUpdateRequirementPrompt({
          name: validatedData.name,
          description: validatedData.description,
          type: validatedData.type,
          requirement: validatedData.requirement,
          userMessage: validatedData.userMessage,
          requirementAbbr: validatedData.requirementAbbr,
          brds: validatedData.brds,
        });
        traceName = traceBuilder(
          validatedData.requirementAbbr,
          OPERATIONS.CHAT
        );
        break;

      default:
        throw new Error("Invalid chat intent specified");
    }

    // Apply knowledge base constraint if provided
    if (validatedData.knowledgeBase?.trim()) {
      if (!validatedData.bedrockConfig) {
        throw new Error(
          "Bedrock configuration is required when using knowledge base"
        );
      }

      prompt = await LLMUtils.generateKnowledgeBasePromptConstraint(
        validatedData.knowledgeBase,
        prompt,
        validatedData.bedrockConfig
      );
    }

    return { prompt, validatedData, traceName };
  }

  /**
   * Parses and validates JSON response from LLM
   * @param response Raw LLM response
   * @param logPrefix Prefix for log messages
   * @returns Parsed JSON response
   * @throws Error if parsing fails
   */
  private static parseJsonResponse(response: string, logPrefix: string): any {
    try {
      const repairedResponse = repairJSON(response);
      const parsedResponse = JSON.parse(repairedResponse);
      console.log(
        `${logPrefix} LLM response parsed successfully:`,
        parsedResponse
      );
      return parsedResponse;
    } catch (error) {
      console.error(`${logPrefix} Error parsing LLM response:`, error);
      throw new Error("Failed to parse LLM response as JSON");
    }
  }

  /**
   * Handles chat database operations for a document within a solution
   * @param solutionId - The ID of the solution
   * @param documentId - The ID of the document
   * @param userMessage - The message from the user
   * @param aiResponse - The response from the AI
   * @returns The conversation object
   * @throws Error if database operations fail
   */
  private static async saveConversation(
    solutionId: number,
    documentId: number,
    userMessage: string,
    aiResponse: string
  ) {
    try {
      return await solutionFactory.runWithTransaction(
        solutionId,
        async (repo) => {
          // Get existing conversation or create a new one
          const conversation = await repo.getConversationByDocumentId(
            documentId
          );

          if (!conversation) {
            console.log(`Creating new conversation for document ${documentId}`);
            const newConversation = await repo.createConversation({
              documentId,
            });

            if (!newConversation) {
              throw new Error(
                `Failed to create conversation for document ${documentId}`
              );
            }

            // Save both messages in sequence
            const messagePromises = [
              repo.saveMessage({
                conversationId: newConversation.id,
                message: userMessage,
                userType: USER_TYPE.USER,
              }),
              repo.saveMessage({
                conversationId: newConversation.id,
                message: aiResponse,
                userType: USER_TYPE.ASSISTANT,
              }),
            ];

            await Promise.all(messagePromises);
            return conversation;
          }
        }
      );
    } catch (error) {
      console.error(
        `Error in handleChatDbOperations: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }
}
