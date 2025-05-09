import { ChatOpenAI } from "@langchain/openai";
import { LLMConfig, LLMError, ModelInfo } from "../llm-types";
import { LangChainModelProvider } from "./base";
import { LangChainChatGuardrails } from "@presidio-dev/hai-guardrails"
import { guardrailsEngine } from "../../../guardrails";

interface OpenAIConfig extends LLMConfig {
  baseUrl?: string;
  apiKey: string;
  model: string;
  maxRetries?: number;
}

export class OpenAILangChainProvider implements LangChainModelProvider {
  protected configData: OpenAIConfig;
  private model: ChatOpenAI;

  constructor(config: Partial<OpenAIConfig>) {
    this.configData = this.getConfig(config);
    this.model = LangChainChatGuardrails(
      new ChatOpenAI({
        openAIApiKey: this.configData.apiKey,
        modelName: this.configData.model,
        maxRetries: this.configData.maxRetries,
        configuration: {
          baseURL: this.configData.baseUrl,
        },
      }),
      guardrailsEngine
    );
  }

  getConfig(config: Partial<OpenAIConfig>): OpenAIConfig {
    if (!config.apiKey) {
      throw new LLMError("OpenAI API key is required", "openai");
    }
    if (!config.model) {
      throw new LLMError("Model ID is required", "openai");
    }

    return {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model.toLowerCase(),
      maxRetries: config.maxRetries || 3,
    };
  }

  getModel(): ChatOpenAI {
    return this.model;
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.configData.model,
      provider: "openai",
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

export default OpenAILangChainProvider;
