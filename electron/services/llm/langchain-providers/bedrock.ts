import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import { LLMConfig, LLMError, ModelInfo } from "../llm-types";
import { LangChainModelProvider } from "./base";

interface BedrockConfig extends LLMConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  model: string;
}

export class BedrockLangChainProvider implements LangChainModelProvider {
  protected configData: BedrockConfig;
  private model: BedrockChat;

  constructor(config: Partial<BedrockConfig>) {
    this.configData = this.getConfig(config);
    this.model = new BedrockChat({
      model: this.configData.model,
      region: this.configData.region,
      credentials: {
        accessKeyId: this.configData.accessKeyId,
        secretAccessKey: this.configData.secretAccessKey,
        sessionToken: this.configData.sessionToken,
      },
      modelKwargs: {
        maxTokens: 4096,
      },
    });
  }

  getConfig(config: Partial<BedrockConfig>): BedrockConfig {
    if (!config.region) {
      throw new LLMError("AWS region is required", "bedrock");
    }
    if (!config.accessKeyId) {
      throw new LLMError("AWS access key ID is required", "bedrock");
    }
    if (!config.secretAccessKey) {
      throw new LLMError("AWS secret access key is required", "bedrock");
    }
    if (!config.model) {
      throw new LLMError("Model ID is required", "bedrock");
    }

    return {
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken,
      model: config.model,
    };
  }

  getModel(): BedrockChat {
    return this.model;
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.configData.model,
      provider: "bedrock",
    };
  }

  isValid(): boolean {
    try {
      return Boolean(
        this.configData.region &&
          this.configData.accessKeyId &&
          this.configData.secretAccessKey &&
          this.configData.model
      );
    } catch (error) {
      return false;
    }
  }
}
