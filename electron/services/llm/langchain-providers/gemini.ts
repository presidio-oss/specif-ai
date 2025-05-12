import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { LLMConfig, LLMError, ModelInfoV1 } from "../llm-types";
import { LangChainModelProvider } from "./base";

export enum GeminiModelId {
  GEMINI_2_5_PRO_EXP_03_25 = "gemini-2.5-pro-exp-03-25",
  GEMINI_2_5_PRO_PREVIEW_03_25 = "gemini-2.5-pro-preview-03-25",
  GEMINI_2_5_FLASH_PREVIEW_04_17 = "gemini-2.5-flash-preview-04-17",
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",
  GEMINI_2_0_FLASH_EXP = "gemini-2.0-flash-exp",
  GEMINI_1_5_FLASH_002 = "gemini-1.5-flash-002",
  GEMINI_1_5_FLASH_EXP_0827 = "gemini-1.5-flash-exp-0827",
  GEMINI_1_5_FLASH_8B_EXP_0827 = "gemini-1.5-flash-8b-exp-0827",
  GEMINI_1_5_PRO_002 = "gemini-1.5-pro-002",
  GEMINI_1_5_PRO_EXP_0827 = "gemini-1.5-pro-exp-0827",
  GEMINI_2_0_PRO_EXP_02_05 = "gemini-2.0-pro-exp-02-05",
  GEMINI_2_0_FLASH_THINKING_EXP_01_21 = "gemini-2.0-flash-thinking-exp-01-21",
  GEMINI_2_0_FLASH_THINKING_EXP_1219 = "gemini-2.0-flash-thinking-exp-1219",
  GEMINI_EXP_1206 = "gemini-exp-1206",
}

const GeminiModels: Record<GeminiModelId, ModelInfoV1> = {
  [GeminiModelId.GEMINI_2_5_PRO_EXP_03_25]: {
    maxTokens: 65536,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_2_5_PRO_PREVIEW_03_25]: {
    maxTokens: 65536,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_2_5_FLASH_PREVIEW_04_17]: {
    maxTokens: 65536,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_2_0_FLASH_001]: {
    maxTokens: 8192,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_2_0_PRO_EXP_02_05]: {
    maxTokens: 8192,
    contextWindow: 2_097_152,
  },
  [GeminiModelId.GEMINI_2_0_FLASH_THINKING_EXP_01_21]: {
    maxTokens: 65_536,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_2_0_FLASH_THINKING_EXP_1219]: {
    maxTokens: 8192,
    contextWindow: 32_767,
  },
  [GeminiModelId.GEMINI_2_0_FLASH_EXP]: {
    maxTokens: 8192,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_1_5_FLASH_002]: {
    maxTokens: 8192,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_1_5_FLASH_EXP_0827]: {
    maxTokens: 8192,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_1_5_FLASH_8B_EXP_0827]: {
    maxTokens: 8192,
    contextWindow: 1_048_576,
  },
  [GeminiModelId.GEMINI_1_5_PRO_002]: {
    maxTokens: 8192,
    contextWindow: 2_097_152,
  },
  [GeminiModelId.GEMINI_1_5_PRO_EXP_0827]: {
    maxTokens: 8192,
    contextWindow: 2_097_152,
  },
  [GeminiModelId.GEMINI_EXP_1206]: {
    maxTokens: 8192,
    contextWindow: 2_097_152,
  },
};

// Update GeminiConfig interface
interface GeminiConfig extends LLMConfig {
  apiKey: string;
  model: GeminiModelId;
}

export class GeminiLangChainProvider implements LangChainModelProvider {
  protected configData: GeminiConfig;
  private defaultModel = GeminiModelId.GEMINI_2_0_FLASH_001;
  private model: ChatGoogleGenerativeAI;

  constructor(config: Partial<GeminiConfig>) {
    this.configData = this.getConfig(config);
    const modelInfo = GeminiModels[this.configData.model];

    this.model = new ChatGoogleGenerativeAI({
      apiKey: this.configData.apiKey,
      model: this.configData.model,
      maxOutputTokens: modelInfo.maxTokens ?? 8192,
    });
  }

  getConfig(config: Partial<GeminiConfig>): GeminiConfig {
    const apiKey = config.apiKey || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
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
      apiKey: apiKey,
      model: config.model,
    };
  }

  getChatModel(): ChatGoogleGenerativeAI {
    return this.model;
  }

  getModel() {
    const modelInfo = GeminiModels[this.configData.model];

    return {
      id: this.configData.model,
      provider: "gemini",
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

export default GeminiLangChainProvider;
