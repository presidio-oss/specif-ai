const { AmazonKnowledgeBasesRetriever } = require('@langchain/aws');

class LLMUtils {
  /**
   * Prepares a formatted list of messages for the LLM, optionally including chat history.
   * @param {string} prompt - The main user query or instruction to be sent to the LLM.
   * @param {Array} chatHistory - Optional list of objects containing previous chat messages.
   * @returns {Array} A list of message objects structured for LLM processing.
   * @throws {Error} If the provided prompt is invalid (empty or not a string).
   */
  static prepareMessages(prompt, chatHistory = null) {
    console.info("Entering <LLMUtils.prepareMessages>");
    const messages = [];

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
   * @param {string} knowledgeBaseId - The unique identifier for the knowledge base.
   * @param {string} prompt - The query used to fetch relevant content.
   * @returns {Array} A list of knowledge base content relevant to the query.
   * @throws {Error} If the knowledgeBaseId or prompt is empty or invalid.
   */
  static async retrieveKnowledgeBaseContent(knowledgeBaseId, prompt) {
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
      // Initialize the knowledge base retriever with search configurations
      const retriever = new AmazonKnowledgeBasesRetriever({
        knowledgeBaseId: knowledgeBaseId,
        retrievalConfig: { vectorSearchConfiguration: { numberOfResults: 4 } }
      });

      // Fetch relevant knowledge base content
      const result = await retriever.invoke(prompt);
      const references = result.map(item => item.pageContent);

      console.info("Exited <LLMUtils.retrieveKnowledgeBaseContent>");
      return references;
    } catch (error) {
      console.error(`Error in retrieveKnowledgeBaseContent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates a prompt with strict constraints based on the retrieved knowledge base content.
   * @param {string} knowledgeBaseId - The unique identifier for the knowledge base.
   * @param {string} prompt - The original user query or instruction.
   * @returns {Promise<string>} A modified prompt that includes knowledge base references.
   */
  static async generateKnowledgeBasePromptConstraint(knowledgeBaseId, prompt) {
    console.info("Entering <LLMUtils.generateKnowledgeBasePromptConstraint>");

    try {
      // Retrieve knowledge base content to include in the prompt
      const knowledgeBaseContent = await LLMUtils.retrieveKnowledgeBaseContent(knowledgeBaseId, prompt);

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
      console.error(`Error in generateKnowledgeBasePromptConstraint: ${error.message}`);
      throw error;
    }
  }
}

module.exports = LLMUtils;