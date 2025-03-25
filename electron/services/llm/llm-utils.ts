import { AmazonKnowledgeBaseRetriever } from '@langchain/aws';

interface ChatMessage {
    role: string;
    content: string;
}

interface BedrockConfig {
    region: string;
    accessKey: string;
    secretKey: string;
    sessionKey?: string;
}

import type { DocumentInterface } from '@langchain/core/documents';

export class LLMUtils {
    /**
     * Prepares a formatted list of messages for the LLM, optionally including chat history.
     * @param prompt - The main user query or instruction to be sent to the LLM.
     * @param chatHistory - Optional list of objects containing previous chat messages.
     * @returns A list of message objects structured for LLM processing.
     * @throws {Error} If the provided prompt is invalid (empty or not a string).
     */
    static async prepareMessages(prompt: string, chatHistory: Record<string, string>[] = []): Promise<ChatMessage[]> {
        console.info("Entering <LLMUtils.prepareMessages>");
        const messages: ChatMessage[] = [];

        // Validate the prompt input
        if (!prompt || typeof prompt !== 'string') {
            throw new Error("Invalid prompt provided.");
        }

        // If chat history exists and is valid, format it appropriately
        if (chatHistory && Array.isArray(chatHistory)) {
            for (const chat of chatHistory) {
                for (const [key, value] of Object.entries(chat)) {
                    messages.push({ role: key, content: value });
                }
            }
        }

        // Append the current user query to the message list
        messages.push({ role: "user", content: prompt });

        console.info("Exited <LLMUtils.prepareMessages>");
        return messages;
    }

    /**
     * Retrieves relevant knowledge base content based on the user prompt.
     * @param knowledgeBaseId - The unique identifier for the knowledge base.
     * @param prompt - The query used to fetch relevant content.
     * @param config - The AWS configuration for knowledge base access.
     * @returns A list of knowledge base content relevant to the query.
     * @throws {Error} If the knowledgeBaseId or prompt is empty or invalid.
     */
    static async retrieveKnowledgeBaseContent(knowledgeBaseId: string, prompt: string, config: BedrockConfig): Promise<string[]> {
        console.info("Entering <LLMUtils.retrieveKnowledgeBaseContent>");

        // Validate the knowledge base ID
        knowledgeBaseId = knowledgeBaseId.trim();
        if (!knowledgeBaseId) {
            throw new Error('Knowledge base ID cannot be empty.');
        }

        // Validate the user query
        prompt = prompt.trim();
        if (!prompt) {
            throw new Error('Prompt cannot be empty.');
        }

        try {
            // Initialize the knowledge base retriever with AWS credentials from config
            console.log("Received <retrieveKnowledgeBaseContent>", config);
            const retriever = new AmazonKnowledgeBaseRetriever({
                knowledgeBaseId: knowledgeBaseId,
                topK: 4,
                region: config.region,
                clientOptions: {
                    credentials: {
                        accessKeyId: config.accessKey,
                        secretAccessKey: config.secretKey,
                        ...(config.sessionKey && { sessionToken: config.sessionKey })
                    }
                }
            });

            // Fetch relevant knowledge base content
            const result = await retriever.invoke(prompt);
            const references = result.map((item: DocumentInterface) => item.pageContent);

            console.info("Exited <LLMUtils.retrieveKnowledgeBaseContent>");
            return references;
        } catch (error) {
            console.error(`Error in retrieveKnowledgeBaseContent: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Generates a prompt with strict constraints based on the retrieved knowledge base content.
     * @param knowledgeBaseId - The unique identifier for the knowledge base.
     * @param prompt - The original user query or instruction.
     * @param config - The AWS configuration for knowledge base access.
     * @returns A modified prompt that includes knowledge base references.
     */
    static async generateKnowledgeBasePromptConstraint(knowledgeBaseId: string, prompt: string, config: BedrockConfig): Promise<string> {
        console.info("Entering <LLMUtils.generateKnowledgeBasePromptConstraint>");

        try {
            // Retrieve knowledge base content to include in the prompt
            const knowledgeBaseContent = await LLMUtils.retrieveKnowledgeBaseContent(knowledgeBaseId, prompt, config);

            // Structure the prompt to prioritize the retrieved references
            const knowledgeBaseMessage = 
                "\n\nConsider these references as strict constraints:\n" +
                knowledgeBaseContent.join("\n") +
                "\n\nMake sure all responses adhere to these strict exclusivity rules.";

            // Append the user query to the structured reference message
            const enhancedPrompt = knowledgeBaseMessage + "\n\nUser Query:\n" + prompt;

            console.info("Exited <LLMUtils.generateKnowledgeBasePromptConstraint>");
            return enhancedPrompt;
        } catch (error) {
            console.error(`Error in generateKnowledgeBasePromptConstraint: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}
