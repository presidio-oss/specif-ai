const { AzureOpenAI } = require("openai");
const LLMHandler = require("./llm-handler");

class AzureOpenAIHandler extends LLMHandler {
  constructor(
    apiKey,
    endpoint,
    deploymentId,
    apiVersion = process.env.AZURE_API_VERSION
  ) {
    super();
    if (!apiKey || !endpoint || !deploymentId) {
      throw new Error(
        "Azure OpenAI API key, endpoint, and deployment ID are required"
      );
    }
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.deploymentId = deploymentId;
    this.apiVersion = apiVersion;
    this.client = new AzureOpenAI({
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      deployment: this.deploymentId,
      apiVersion: this.apiVersion,
    });
  }

  async invoke(messages, systemPrompt = null) {
    try {
      const messageList = [...messages];
      if (systemPrompt) {
        messageList.unshift({ role: "system", content: systemPrompt });
      }

      const response = await this.client.chat.completions.create({
        model: this.deploymentId,
        messages: messageList,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    } catch (error) {
      throw new Error(`Azure OpenAI API error: ${error.message}`);
    }
  }

  getConfig(config) {
    return {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      deploymentId: config.deploymentId,
    };
  }

  getModel() {
    return this.deploymentId;
  }

  isValid() {
    return !!this.apiKey && !!this.endpoint && !!this.deploymentId;
  }
}

module.exports = AzureOpenAIHandler;
