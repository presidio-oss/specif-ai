import { LangChainModelProvider } from "./langchain-providers/base";
import { LLMError, LLMProvider } from "./llm-types";

import { AnthropicLangChainProvider } from "./langchain-providers/anthropic";
import { AzureOpenAILangChainProvider } from "./langchain-providers/azure-openai";
import { BedrockLangChainProvider } from "./langchain-providers/bedrock";
import { GeminiLangChainProvider } from "./langchain-providers/gemini";
import { OllamaLangChainProvider } from "./langchain-providers/ollama";
import { OpenAILangChainProvider } from "./langchain-providers/openai";
import { OpenRouterLangChainProvider } from "./langchain-providers/openrouter";

/**
 * Creates an instance of the appropriate Langchain implementation based on the specified provider.
 * @param provider - The LLM provider to use (e.g., "openai", "anthropic")
 * @param config - Configuration options for the LLM provider
 * @returns An instance of the corresponding Langchain implementation
 */
export function buildLangchainModelProvider(
  provider: LLMProvider | string,
  config: Record<string, any>
): LangChainModelProvider {
  const providerName =
    typeof provider === "string" ? provider : String(provider);

  switch (providerName.toLowerCase()) {
    case LLMProvider.OPENAI_NATIVE:
      return new OpenAILangChainProvider(config);
    case LLMProvider.ANTHROPIC:
      return new AnthropicLangChainProvider(config);
    case LLMProvider.BEDROCK:
      return new BedrockLangChainProvider(config);
    case LLMProvider.OLLAMA:
      return new OllamaLangChainProvider(config);
    case LLMProvider.GEMINI:
      return new GeminiLangChainProvider(config);
    case LLMProvider.OPENAI:
      return new AzureOpenAILangChainProvider(config);
    case LLMProvider.OPENROUTER:
      return new OpenRouterLangChainProvider(config);
    default:
      throw new LLMError(
        `Invalid provider: ${provider}. Must be one of: ${Object.values(
          LLMProvider
        ).join(", ")}`,
        "builder"
      );
  }
}
