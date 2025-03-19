class LLMHandler {
  /**
   * Executes the LLM request.
   * This method should be implemented by subclasses to process the input
   * and generate a response using the corresponding LLM provider.
   * @param {Array} messages - A list of input messages for the LLM.
   * @param {string} [systemPrompt] - An optional system-level prompt to guide the response.
   * @returns {Promise<string>} - The generated response from the LLM.
   */
  async invoke(messages, systemPrompt = null) {
    throw new Error('Method "invoke" must be implemented in subclasses');
  }

  /**
   * Parses the LLM configuration from the provided dictionary.
   * This method should be implemented by subclasses to extract relevant
   * configuration parameters required for the LLM provider.
   * @param {Object} config - A dictionary containing LLM-specific configuration details.
   * @returns {any} - LLM specific configuration object.
   */
  getConfig(config) {
    throw new Error('Method "getConfig" must be implemented in subclasses');
  }

  /**
   * Retrieves the model information for the LLM provider.
   * @returns {any} - Model identifier or configuration details specific to the provider.
   */
  getModel() {
    throw new Error('Method "getModel" must be implemented in subclasses');
  }

  /**
   * Checks if the LLM configuration is valid.
   * @returns {boolean} - True if the configuration is valid, False otherwise.
   */
  isValid() {
    throw new Error('Method "isValid" must be implemented in subclasses');
  }
}

module.exports = LLMHandler;
