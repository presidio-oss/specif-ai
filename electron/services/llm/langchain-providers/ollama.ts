import { ChatOllama } from "@langchain/ollama";
import { LLMConfig, LLMError } from "../llm-types";
import { LangChainModelProvider } from "./base";

interface OllamaConfig extends LLMConfig {
  baseUrl: string;
  model: string;
}

export class OllamaLangChainProvider implements LangChainModelProvider {
  protected configData: OllamaConfig;
  private defaultBaseUrl = "http://localhost:11434";
  private model: ChatOllama;

  constructor(config: Partial<OllamaConfig>) {
    this.configData = this.getConfig(config);
    this.model = new ChatOllama({
      baseUrl: this.configData.baseUrl,
      model: this.configData.model,
    });
  }

  getConfig(config: Partial<OllamaConfig>): OllamaConfig {
    if (!config.model) {
      throw new LLMError("Model ID is required", "ollama");
    }

    return {
      baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || this.defaultBaseUrl,
      model: config.model.toLowerCase(),
    };
  }

  getChatModel(): ChatOllama {
    return this.model;
  }

  getModel() {
    return {
      id: this.configData.model,
      provider: "ollama",
      info: {},
    };
  }

  async isValid(): Promise<boolean> {
    try {
      const response = await fetch(`${this.configData.baseUrl}/api/tags`);
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return Array.isArray(data.models) && 
        data.models.some((model: any) => model.name === this.configData.model);
    } catch (error) {
      return false;
    }
  }
}

export default OllamaLangChainProvider;
