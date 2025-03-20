import { AzureOpenAI } from "openai";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";

interface AzureOpenAIConfig extends LLMConfig {
  apiKey: string;
  endpoint: string;
  deploymentId: string;
  apiVersion?: string;
}

interface AzureModelInfo extends ModelInfo {
  endpoint: string;
  deploymentId: string;
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
      deployment: this.configData.deploymentId,
      apiVersion: this.configData.apiVersion,
    });
  }

  getConfig(config: Partial<AzureOpenAIConfig>): AzureOpenAIConfig {
    if (!config.apiKey && !process.env.AZURE_OPENAI_API_KEY) {
      throw new LLMError("Azure OpenAI API key is required", "openai");
    }
    if (!config.endpoint) {
      throw new LLMError("Azure OpenAI endpoint is required", "openai");
    }
    if (!config.deploymentId) {
      throw new LLMError("Azure OpenAI deployment ID is required", "openai");
    }

    return {
      apiKey: config.apiKey || process.env.AZURE_OPENAI_API_KEY || '',
      endpoint: config.endpoint,
      deploymentId: config.deploymentId,
      apiVersion: config.apiVersion || process.env.AZURE_API_VERSION || "2024-02-15-preview"
    };
  }

  async invoke(messages: Message[], systemPrompt: string | null = null): Promise<string> {
    try {
      const messageList = [...messages];
      if (systemPrompt) {
        messageList.unshift({ role: "system", content: systemPrompt });
      }

      const openAIMessages = messageList.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name })
      })) as any[];  

      const response = await this.client.chat.completions.create({
        model: this.configData.deploymentId,
        messages: openAIMessages,
        response_format: { type: "json_object"},
        max_tokens: 1000,
        temperature: 0.7,
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new LLMError("No response content received from Azure OpenAI API", "azure-openai");
      }

      return response.choices[0].message.content;
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error occurred";
      throw new LLMError(`Azure OpenAI API error: ${errorMessage}`, "azure-openai");
    }
  }

  getModel(): AzureModelInfo {
    return {
      id: this.configData.deploymentId,
      provider: this.configData.provider,
      deploymentId: this.configData.deploymentId,
      apiVersion: this.configData.apiVersion,
      endpoint: this.configData.endpoint,
    };
  }

  isValid(): boolean {
    try {
      return Boolean(
        this.configData.apiKey && 
        this.configData.endpoint && 
        this.configData.deploymentId
      );
    } catch (error) {
      return false;
    }
  }
}

export default AzureOpenAIHandler;
