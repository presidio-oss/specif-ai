# Standard library imports
from enum import Enum

# Third-party imports
from typing import List, Any, Optional
from typing_extensions import Annotated
from anthropic import Anthropic, DEFAULT_MAX_RETRIES, NOT_GIVEN
from pydantic import BaseModel, AfterValidator, Field

# Local application imports
from llm.providers import LLMHandler
from utils.env_utils import EnvVariables, get_env_variable
from utils.validator_utils import ValidatorsUtil
from utils.common_utils import safe_parse_pydantic_model
from config.logging_config import logger


# Models
class AnthropicSupportedModels(Enum):
    CLAUDE_3_5_SONNET_20241022 = ('claude-3-5-sonnet-20241022', 8192)
    CLAUDE_3_5_HAIKU_20241022 = ('claude-3-5-haiku-20241022', 8192)
    CLAUDE_3_5_OPUS_20240229 = ('claude-3-opus-20240229', 4096)
    CLAUDE_3_5_HAIKU_20240307 = ('claude-3-haiku-20240307', 4096)

    @property
    def name(self):
        return self.value[0]

    @property
    def max_tokens(self):
        return self.value[1]


# LLM specific configuration
class AnthropicConfig(BaseModel):
    base_url: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: get_env_variable(key=EnvVariables.ANTHROPIC_BASE_URL)
    )
    api_key: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: get_env_variable(key=EnvVariables.ANTHROPIC_API_KEY)
    )
    model_id: Annotated[
        str,
        AfterValidator(ValidatorsUtil.empty_string),
        AfterValidator(ValidatorsUtil.to_lowercase)
    ]
    max_retries: int = DEFAULT_MAX_RETRIES


# Handler
class AnthropicHandler(LLMHandler):
    DEFAULT_MODEL = AnthropicSupportedModels.CLAUDE_3_5_SONNET_20241022

    def __init__(self, **kwargs):
        logger.info('Entered <AnthropicHandler.init>')

        # Parse configuration from kwargs
        self._config = self.get_config(config=kwargs)

        # Create client
        self._client = Anthropic(
            api_key=self._config.api_key,
            base_url=self._config.base_url,
            max_retries=self._config.max_retries
        )
        logger.info('Created Anthropic client')

        logger.info('Exited <AnthropicHandler.init>')

    def get_config(self, config: dict) -> AnthropicConfig:
        logger.info('Entered <AnthropicHandler.get_config>')

        parsed_data, error = safe_parse_pydantic_model(
            model=AnthropicConfig,
            data=config
        )
        if bool(error):
            raise Exception(error)

        logger.info('Exited <AnthropicHandler.get_config>')
        return parsed_data

    def invoke(self, messages: List[Any], system_prompt: str = None):
        logger.info('Entered <AnthropicHandler.invoke>')
        system_prompt = (system_prompt or '').strip()

        # TODO: Handle stream
        model_info = self.get_model()
        response = self._client.messages.create(
            model=model_info['id'],
            max_tokens=model_info['max_tokens'] or 8192,
            system=[{'text': system_prompt, 'type': 'text'}] if bool(system_prompt) else NOT_GIVEN,
            messages=messages,
            stream=False
        )

        logger.info('Exited <AnthropicHandler.invoke>')
        return response.content[0].text if len(response.content) > 0 else ''

    def get_model(self):
        logger.info('Entered <AnthropicHandler.get_model>')

        model_info = self.DEFAULT_MODEL
        for model in AnthropicSupportedModels:
            if model.name == self._config.model_id:
                model_info = model
                break

        logger.info('Exited <AnthropicHandler.get_model>')
        return {
            'id': model_info.name,
            'max_tokens': model_info.max_tokens
        }

    def is_valid(self) -> bool:
        logger.info('Entered <AnthropicHandler.is_valid>')

        output = False
        try:
            model_info = self.get_model()
            self._client.messages.create(
                model=model_info['id'],
                max_tokens=1,
                messages=[{'role': 'user', 'content': 'Test'}],
                stream=False
            )
            output = True
        except Exception as e:
            logger.error(f'Error validating Anthropic credentials: {e}')

        logger.info('Exited <AnthropicHandler.is_valid>')
        return output
