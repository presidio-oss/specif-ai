import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";

interface BedrockConfig extends LLMConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  model: string;
}

export class BedrockHandler extends LLMHandler {
  private client: BedrockRuntimeClient;
  protected configData: BedrockConfig;
  
  constructor(config: Partial<BedrockConfig>) {
    super();
    this.configData = this.getConfig(config);
    
    const credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    } = {
      accessKeyId: this.configData.accessKeyId,
      secretAccessKey: this.configData.secretAccessKey
    };

    if (this.configData.sessionToken) {
      credentials.sessionToken = this.configData.sessionToken;
    }

    this.client = new BedrockRuntimeClient({
      region: this.configData.region,
      credentials
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
      model: config.model
    };
  }

  async invoke(messages: Message[], systemPrompt: string | null = null): Promise<string> {
    try {
      const messageList = [...messages];
      if (systemPrompt) {
        messageList.unshift({ role: "system", content: systemPrompt });
      }

      // Format request body based on model provider
      let requestBody;
      if (this.configData.model.includes('anthropic')) {
        requestBody = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4096,
          messages: messageList.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: [{ type: 'text', text: msg.content }]
          })),
          ...(systemPrompt && { system: systemPrompt })
        };
      } else {
        // Default to OpenAI-compatible format
        requestBody = {
          messages: messageList.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        };
      }

      const command = new InvokeModelCommand({
        modelId: this.configData.model,
        body: JSON.stringify(requestBody)
      });

      const response = await this.client.send(command);
      
      // Parse response based on model provider
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      if (this.configData.model.includes('anthropic')) {
        if (!responseBody.content?.[0]?.text) {
          throw new LLMError("No response content received from Bedrock Anthropic model", "bedrock");
        }
        return responseBody.content[0].text;
      } else {
        // Default to OpenAI-compatible format
        if (!responseBody.choices?.[0]?.message?.content) {
          throw new LLMError("No response content received from Bedrock", "bedrock");
        }
        return responseBody.choices[0].message.content;
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error occurred";
      throw new LLMError(`AWS Bedrock error: ${errorMessage}`, "bedrock");
    }
  }

  getModel(): ModelInfo {
    return {
      id: this.configData.model,
      provider: 'bedrock'
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

export default BedrockHandler;
