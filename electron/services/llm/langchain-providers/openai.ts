import { ChatOpenAI } from "@langchain/openai";
import { LLMConfig, LLMError, ModelInfoV1 } from "../llm-types";
import { LangChainModelProvider } from "./base";

export enum OpenAiModelId {
  O3 = "o3",
  O4_MINI = "o4-mini",
  GPT_4_1 = "gpt-4.1",
  GPT_4_1_MINI = "gpt-4.1-mini",
  GPT_4_1_NANO = "gpt-4.1-nano",
  O3_MINI = "o3-mini",
  O1 = "o1",
  O1_PREVIEW = "o1-preview",
  O1_MINI = "o1-mini",
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  CHATGPT_4O_LATEST = "chatgpt-4o-latest",
  GPT_4_5_PREVIEW = "gpt-4.5-preview",
}

const OpenAiModels: Record<OpenAiModelId, ModelInfoV1> = {
  [OpenAiModelId.O3]: {
    maxTokens: 100_000,
    contextWindow: 200_000,
  },
  [OpenAiModelId.O4_MINI]: {
    maxTokens: 100_000,
    contextWindow: 200_000,
  },
  [OpenAiModelId.GPT_4_1]: {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
  },
  [OpenAiModelId.GPT_4_1_MINI]: {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
  },
  [OpenAiModelId.GPT_4_1_NANO]: {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
  },
  [OpenAiModelId.O3_MINI]: {
    maxTokens: 100_000,
    contextWindow: 200_000,
  },
  [OpenAiModelId.O1]: {
    maxTokens: 100_000,
    contextWindow: 200_000,
  },
  [OpenAiModelId.O1_PREVIEW]: {
    maxTokens: 32_768,
    contextWindow: 128_000,
  },
  [OpenAiModelId.O1_MINI]: {
    maxTokens: 65_536,
    contextWindow: 128_000,
  },
  [OpenAiModelId.GPT_4O]: {
    maxTokens: 4_096,
    contextWindow: 128_000,
  },
  [OpenAiModelId.GPT_4O_MINI]: {
    maxTokens: 16_384,
    contextWindow: 128_000,
  },
  [OpenAiModelId.CHATGPT_4O_LATEST]: {
    maxTokens: 16_384,
    contextWindow: 128_000,
  },
  [OpenAiModelId.GPT_4_5_PREVIEW]: {
    maxTokens: 16_384,
    contextWindow: 128_000,
  },
};

interface OpenAIConfig extends LLMConfig {
  baseUrl?: string;
  apiKey: string;
  model: OpenAiModelId;
  maxRetries?: number;
}

export class OpenAILangChainProvider implements LangChainModelProvider {
  protected configData: OpenAIConfig;
  private model: ChatOpenAI;

  constructor(config: Partial<OpenAIConfig>) {
    this.configData = this.getConfig(config);
    const modelInfo = OpenAiModels[this.configData.model];

    this.model = new ChatOpenAI({
      openAIApiKey: this.configData.apiKey,
      modelName: this.configData.model,
      maxRetries: this.configData.maxRetries,
      configuration: {
        baseURL: this.configData.baseUrl,
      },
      maxTokens: modelInfo.maxTokens,
    });
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
      model: config.model,
      maxRetries: config.maxRetries || 3,
    };
  }

  getChatModel(): ChatOpenAI {
    return this.model;
  }

  getModel() {
    const modelInfo = OpenAiModels[this.configData.model];

    return {
      id: this.configData.model,
      provider: "openai",
      info: modelInfo,
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
