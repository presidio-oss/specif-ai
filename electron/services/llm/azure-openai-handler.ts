import { AzureOpenAI } from "openai";
import LLMHandler, { Message, ModelInfo } from "./llm-handler";

export class AzureOpenAIHandler extends LLMHandler {
  private client: AzureOpenAI;
  private apiKey: string;
  private endpoint: string;
  private deploymentId: string;
  private apiVersion: string;

  constructor(
    apiKey: string,
    endpoint: string,
    deploymentId: string,
    apiVersion: string = process.env.AZURE_API_VERSION || "2024-02-15-preview"
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
    this.config = this.getConfig({
      apiKey,
      endpoint,
      deploymentId,
      apiVersion
    });
    this.client = new AzureOpenAI({
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      deployment: this.deploymentId,
      apiVersion: this.apiVersion,
    });
  }

  async invoke(messages: Message[], systemPrompt: string | null = null): Promise<string> {
    try {
      const messageList = [...messages];
      if (systemPrompt) {
        messageList.unshift({ role: "system", content: systemPrompt });
      }

      // Convert messages to OpenAI's expected format
      const openAIMessages = messageList.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name })
      })) as any[];  // Use type assertion to bypass strict typing

      const response = await this.client.chat.completions.create({
        model: this.deploymentId,
        messages: openAIMessages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new Error("No response content received from Azure OpenAI API");
      }

      return response.choices[0].message.content;
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error occurred";
      throw new Error(`Azure OpenAI API error: ${errorMessage}`);
    }
  }

  getConfig(config: Record<string, any>): Record<string, any> {
    return {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      deploymentId: config.deploymentId,
      apiVersion: config.apiVersion,
    };
  }

  getModel(): ModelInfo {
    return {
      id: this.deploymentId,
      provider: "azure-openai",
      endpoint: this.endpoint,
    };
  }

  isValid(): boolean {
    try {
      return Boolean(this.apiKey && this.endpoint && this.deploymentId);
    } catch (error) {
      return false;
    }
  }
}
