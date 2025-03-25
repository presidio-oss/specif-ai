import { AzureOpenAI } from "openai";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";
import { withRetry } from "../../../utils/retry";

interface AzureOpenAIConfig extends LLMConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion?: string;
}

interface AzureModelInfo extends ModelInfo {
  endpoint: string;
  deployment: string;
  apiVersion?: string;
}

export class AzureOpenAIHandler extends LLMHandler {
  private client: AzureOpenAI;
  protected configData: AzureOpenAIConfig;

  constructor(config: Partial<AzureOpenAIConfig>) {
    super();
    this.configData = this.getConfig(config);

    this.client = new AzureOpenAI({
      apiKey: this.configData.apiKey,
      endpoint: this.configData.endpoint,
      deployment: this.configData.deployment,
      apiVersion: this.configData.apiVersion,
    });
  }

  getConfig(config: Partial<AzureOpenAIConfig>): AzureOpenAIConfig {
    if (!config.apiKey) {
      throw new LLMError("Azure OpenAI API key is required", "openai");
    }
    if (!config.endpoint) {
      throw new LLMError("Azure OpenAI endpoint is required", "openai");
    }
    if (!config.deployment) {
      throw new LLMError("Azure OpenAI deployment ID is required", "openai");
    }

    return {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      deployment: config.deployment,
      apiVersion: config.apiVersion,
    };
  }

  @withRetry({ retryAllErrors: true })
  async invoke(
    messages: Message[],
    systemPrompt: string | null = null
  ): Promise<string> {
    const messageList = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : [...messages];

    const openAIMessages = messageList.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
    })) as any[];

    const response = await this.client.chat.completions.create({
      model: this.configData.deployment,
      messages: openAIMessages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new LLMError(
        "No response content received from Azure OpenAI API",
        "azure-openai"
      );
    }

    return response.choices[0].message.content;
  }

  getModel(): AzureModelInfo {
    return {
      id: this.configData.deployment,
      provider: this.configData.provider,
      deployment: this.configData.deployment,
      apiVersion: this.configData.apiVersion,
      endpoint: this.configData.endpoint,
    };
  }

  isValid(): boolean {
    try {
      return Boolean(
        this.configData.apiKey &&
          this.configData.endpoint &&
          this.configData.deployment
      );
    } catch (error) {
      return false;
    }
  }
}

export default AzureOpenAIHandler;
