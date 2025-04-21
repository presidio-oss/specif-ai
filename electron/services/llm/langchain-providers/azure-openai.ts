import { AzureChatOpenAI } from "@langchain/openai";
import { LLMConfig, LLMError, ModelInfo } from "../llm-types";
import { LangChainModelProvider } from "./base";

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

export class AzureOpenAILangChainProvider implements LangChainModelProvider {
  protected configData: AzureOpenAIConfig;
  private model: AzureChatOpenAI;

  constructor(config: Partial<AzureOpenAIConfig>) {
    this.configData = this.getConfig(config);
    this.model = new AzureChatOpenAI({
      azureOpenAIApiKey: this.configData.apiKey,
      azureOpenAIEndpoint: this.configData.endpoint,
      azureOpenAIApiDeploymentName: this.configData.deployment,
      azureOpenAIApiVersion:
        this.configData.apiVersion || "2024-09-01-preview",
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
      apiVersion: config.apiVersion || "2024-09-01-preview",
    };
  }

  getModel(): AzureChatOpenAI {
    return this.model;
  }

  getModelInfo(): AzureModelInfo {
    return {
      id: this.configData.deployment,
      provider: "azure-openai",
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

export default AzureOpenAILangChainProvider;
