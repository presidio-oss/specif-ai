# Standard library imports
from enum import Enum

# Local application imports
from llm.providers.openai_handler import OpenAIHandler
from llm.providers.openai_native_handler import OpenAINativeHandler
from llm.providers.bedrock_handler import AWSBedrockHandler
from llm.providers.anthropic_handler import AnthropicHandler


# Supported LLM providers
class LLMProvider(Enum):
    OPENAI = 'openai'
    OPENAI_NATIVE = 'openai-native'
    ANTHROPIC = 'anthropic'
    BEDROCK = 'bedrock'


def build_llm_handler(provider: str, **kwargs):
    """
    Builds an LLM handler based on the specified provider.
    Args:
        provider (str): The name of the LLM provider (e.g., "openai", "anthropic"), Refer to LLMProvider enum.
        **kwargs: Additional keyword arguments that may be needed for specific providers.
    Raises:
        Exception: If the provider is empty or not a valid option from `LLMProvider`.
    Returns:
        Corresponding handler instance for the selected LLM provider.
    """
    provider = provider.strip().lower()
    provider_list = [item.value for item in LLMProvider]

    if not bool(provider):
        raise Exception(f'Provider cannot be empty. It must be one of {provider_list}')

    match provider:
        case LLMProvider.OPENAI.value:
            return OpenAIHandler(**kwargs)
        case LLMProvider.OPENAI_NATIVE.value:
            return OpenAINativeHandler(**kwargs)
        case LLMProvider.ANTHROPIC.value:
            return AnthropicHandler(**kwargs)
        case LLMProvider.BEDROCK.value:
            return AWSBedrockHandler(**kwargs)
        case _:
            raise Exception(f'Invalid provider: {provider}, Allowed values: {provider_list}')
