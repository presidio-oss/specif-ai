import { ChatOpenAI } from "@langchain/openai";
import { LLMConfig, LLMError, ModelInfo } from "../llm-types";
import { LangChainModelProvider } from "./base";

interface OpenRouterConfig extends LLMConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export class OpenRouterLangChainProvider implements LangChainModelProvider {
  protected configData: OpenRouterConfig;
  private defaultBaseUrl: string = "https://openrouter.ai/api/v1";
  private model: ChatOpenAI;

  constructor(config: Partial<OpenRouterConfig>) {
    this.configData = this.getConfig(config);
    this.model = new ChatOpenAI({
      openAIApiKey: this.configData.apiKey,
      modelName: this.configData.model,
      configuration: {
        baseURL: this.configData.baseUrl || this.defaultBaseUrl,
      },
    });
  }

  getConfig(config: Partial<OpenRouterConfig>): OpenRouterConfig {
    if (!config.apiKey) {
      throw new LLMError("OpenRouter API key is required", "openrouter");
    }
    if (!config.model) {
      throw new LLMError("OpenRouter model is required", "openrouter");
    }

    return {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl || this.defaultBaseUrl,
    };
  }

  getModel(): ChatOpenAI {
    return this.model;
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.configData.model,
      provider: "openrouter",
    };
  }

  isValid(): boolean {
    try {
      return Boolean(this.configData.apiKey && this.configData.model);
    } catch (error) {
      return false;
    }
  }
}

export default OpenRouterLangChainProvider;
