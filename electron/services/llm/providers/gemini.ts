import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";
import { withRetry } from "../../../utils/retry";

interface GeminiConfig extends LLMConfig {
  apiKey: string;
  modelId: string;
}

export class GeminiHandler extends LLMHandler {
  private client: GenerativeModel;
  protected configData: GeminiConfig;
  private defaultModel = "gemini-pro";

  constructor(config: Partial<GeminiConfig>) {
    super();
    this.configData = this.getConfig(config);

    const genAI = new GoogleGenerativeAI(this.configData.apiKey);
    this.client = genAI.getGenerativeModel({ 
      model: this.configData.modelId,
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });
  }

  getConfig(config: Partial<GeminiConfig>): GeminiConfig {
    if (!config.apiKey && !process.env.GOOGLE_API_KEY) {
      throw new LLMError("Google API key is required", "gemini");
    }

    return {
      apiKey: config.apiKey || process.env.GOOGLE_API_KEY || '',
      modelId: (config.modelId || this.defaultModel).toLowerCase()
    };
  }

  @withRetry({ retryAllErrors: true })
  async invoke(messages: Message[], systemPrompt: string | null = null): Promise<string> {
    const messageList = [...messages];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messageList.unshift({ role: "system", content: systemPrompt });
    }

    // Convert messages to Gemini's format
    const history = messageList.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // Start a chat
    const chat = this.client.startChat({
      history: history.slice(0, -1) // Exclude last message for input
    });

    // Send the last message
    const lastMessage = messageList[messageList.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;

    if (!response.text()) {
      throw new LLMError("No response content received from Gemini API", "gemini");
    }

    return response.text();
  }

  getModel(): ModelInfo {
    return {
      id: this.configData.modelId,
      provider: 'gemini'
    };
  }

  async isValid(): Promise<boolean> {
    try {
      // Try to list models to validate API key
      const genAI = new GoogleGenerativeAI(this.configData.apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      await model.generateContent("test");
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default GeminiHandler;
