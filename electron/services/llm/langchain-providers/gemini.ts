import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { LLMConfig, LLMError, ModelInfo } from "../llm-types";
import { LangChainModelProvider } from "./base";

interface GeminiConfig extends LLMConfig {
  apiKey: string;
  model: string;
}

export class GeminiLangChainProvider implements LangChainModelProvider {
  protected configData: GeminiConfig;
  private defaultModel = "gemini-2.0-flash-001";
  private model: ChatGoogleGenerativeAI;

  constructor(config: Partial<GeminiConfig>) {
    this.configData = this.getConfig(config);
    this.model = new ChatGoogleGenerativeAI({
      apiKey: this.configData.apiKey,
      model: this.configData.model,
      maxOutputTokens: 4096,
    });
  }

  getConfig(config: Partial<GeminiConfig>): GeminiConfig {
    if (!config.apiKey && !process.env.GOOGLE_API_KEY) {
      throw new LLMError("Google API key is required", "gemini");
    }

    if (!config.model) {
      console.log(
        "[GeminiHandler] No model provided, using default:",
        this.defaultModel
      );
      throw new LLMError("Model ID is required", "gemini");
    }

    return {
      apiKey: config.apiKey || process.env.GOOGLE_API_KEY || "",
      model: config.model,
    };
  }

  getModel(): ChatGoogleGenerativeAI {
    return this.model;
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.configData.model,
      provider: "gemini",
    };
  }

  async isValid(): Promise<boolean> {
    try {
      return Boolean(this.configData.apiKey && this.configData.model);
    } catch (error) {
      return false;
    }
  }
}

export default GeminiLangChainProvider;
