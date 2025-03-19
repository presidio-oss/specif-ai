class LLMUtils {
  /**
   * Prepares messages for the LLM based on the provided prompt.
   * @param {string} prompt - The prompt to be sent to the LLM.
   * @returns {Array} - An array of messages formatted for the LLM.
   */
  static prepareMessages(prompt) {
    return [
      { role: 'user', content: prompt },
    ];
  }

  /**
   * Generates a knowledge base constraint prompt.
   * @param {string} knowledgeBaseId - The ID of the knowledge base.
   * @param {string} prompt - The base prompt.
   * @returns {string} - The modified prompt with the knowledge base constraint.
   */
  static generateKnowledgeBasePromptConstraint(knowledgeBaseId, prompt) {
    return `Using knowledge base ID: ${knowledgeBaseId}\n\n${prompt}`;
  }
}

module.exports = LLMUtils;
