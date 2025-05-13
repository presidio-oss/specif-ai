import { Message, ModelInfo } from './llm-types';

export abstract class LLMHandler {
  protected config: Record<string, any> = {};

  /**
   * Executes the LLM request.
   * This method should be implemented by subclasses to process the input
   * and generate a response using the corresponding LLM provider.
   * @param messages - A list of input messages for the LLM.
   * @param systemPrompt - An optional system-level prompt to guide the response.
   * @returns The generated response from the LLM.
   */
  abstract invoke(messages: Message[], systemPrompt?: string | null, operation?: string): Promise<string>;

  /**
   * Parses the LLM configuration from the provided dictionary.
   * This method should be implemented by subclasses to extract relevant
   * configuration parameters required for the LLM provider.
   * @param config - A dictionary containing LLM-specific configuration details.
   * @returns LLM specific configuration object.
   */
  abstract getConfig(config: Record<string, any>): Record<string, any>;

  /**
   * Retrieves the model information for the LLM provider.
   * @returns Model identifier and configuration details specific to the provider.
   */
  abstract getModel(): ModelInfo;

  /**
   * Checks if the LLM configuration is valid.
   * @returns True if the configuration is valid, False otherwise.
   */
  abstract isValid(): boolean | Promise<boolean>;
}

export default LLMHandler;
