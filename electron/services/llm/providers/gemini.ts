import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import LLMHandler from "../llm-handler";
import { Message, ModelInfo, LLMConfig, LLMError } from "../llm-types";
import { withRetry } from "../../../utils/retry";
import { ObservabilityManager } from "../../observability/observability.manager";
import { TRACES } from "../../../helper/constants";

interface GeminiConfig extends LLMConfig {
  apiKey: string;
  model: string;
}

export class GeminiHandler extends LLMHandler {
  private client: GenerativeModel;
  protected configData: GeminiConfig;
  private defaultModel = "gemini-2.0-flash-001";
  private trace = new ObservabilityManager().getTrace();

  constructor(config: Partial<GeminiConfig>) {
    super();
    this.configData = this.getConfig(config);

    const genAI = new GoogleGenerativeAI(this.configData.apiKey);
    this.client = genAI.getGenerativeModel({
      model: this.configData.model,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      },
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

    const result = {
      apiKey: config.apiKey || process.env.GOOGLE_API_KEY || "",
      model: config.model,
    };

    return result;
  }

  @withRetry({
    maxRetries: 5,
  })
  async invoke(
    messages: Message[],
    systemPrompt: string | null = null
  ): Promise<string> {
    const messageList = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : [...messages];

    // Convert messages to Gemini's format
    const history = messageList.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Start a chat
    const chat = this.client.startChat({
      history: history.slice(0, -1),
    });


    // Send the last message
    const lastMessage = messageList[messageList.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    this.trace.generation({
      name: TRACES.CHAT_GEMINI,
      model: this.configData.model,
      usage: {
        input: response.usageMetadata?.promptTokenCount,
        output: response.usageMetadata?.candidatesTokenCount,
        total: response.usageMetadata?.totalTokenCount
      },
    });

    if (!response.text()) {
      throw new LLMError(
        "No response content received from Gemini API",
        "gemini"
      );
    }

    return response.text();
  }

  getModel(): ModelInfo {
    return {
      id: this.configData.model,
      provider: "gemini",
    };
  }

  async isValid(): Promise<boolean> {
    try {
      const genAI = new GoogleGenerativeAI(this.configData.apiKey);
      const model = genAI.getGenerativeModel({
        model: this.configData.model,
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0,
        },
      });

      const result = await model.generateContent("Test connection");
      return result.response.text().length > 0;
    } catch (error: any) {
      console.error(`Gemini validation error: ${error.message}`);
      return false;
    }
  }
}

export default GeminiHandler;
