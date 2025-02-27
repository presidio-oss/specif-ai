# Standard library imports
from enum import Enum

# Third-party imports
from typing import List, Any, Optional
from typing_extensions import Annotated
from anthropic import AnthropicBedrock, DEFAULT_MAX_RETRIES, NOT_GIVEN
from pydantic import BaseModel, AfterValidator, Field

# Local application imports
from llm.providers import LLMHandler
from utils.env_utils import EnvVariables, get_env_variable
from utils.validator_utils import ValidatorsUtil
from utils.common_utils import safe_parse_pydantic_model
from config.logging_config import logger


# Models
class AWSBedrockSupportedModels(Enum):
    ANTHROPIC_CLAUDE_3_7_SONNET_20250219_V1_0 = ('anthropic.claude-3-7-sonnet-20250219-v1:0', 8192)
    ANTHROPIC_CLAUDE_3_5_SONNET_20241022_V2_0 = ('anthropic.claude-3-5-sonnet-20241022-v2:0', 8192)
    ANTHROPIC_CLAUDE_3_5_HAIKU_20241022_V1_0 = ('anthropic.claude-3-5-haiku-20241022-v1:0', 8192)
    ANTHROPIC_CLAUDE_3_5_SONNET_20240620_V1_0 = ('anthropic.claude-3-5-sonnet-20240620-v1:0', 8192)
    ANTHROPIC_CLAUDE_3_OPUS_20240229_V1_0 = ('anthropic.claude-3-opus-20240229-v1:0', 4096)
    ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0 = ('anthropic.claude-3-sonnet-20240229-v1:0', 4096)
    ANTHROPIC_CLAUDE_3_HAIKU_20240307_V1_0 = ('anthropic.claude-3-haiku-20240307-v1:0', 4096)

    @property
    def name(self):
        return self.value[0]

    @property
    def max_tokens(self):
        return self.value[1]


# LLM specific configuration
class AWSBedrockConfig(BaseModel):
    base_url: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: (get_env_variable(key=EnvVariables.ANTHROPIC_BEDROCK_BASE_URL) or None)
    )
    aws_access_key: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: (get_env_variable(key=EnvVariables.AWS_BEDROCK_ACCESS_KEY) or None)
    )
    aws_secret_key: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: (get_env_variable(key=EnvVariables.AWS_BEDROCK_SECRET_KEY) or None)
    )
    aws_session_token: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: (get_env_variable(key=EnvVariables.AWS_BEDROCK_SESSION_TOKEN) or None)
    )
    aws_region: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: (get_env_variable(key=EnvVariables.AWS_BEDROCK_REGION) or None)
    )
    model_id: Annotated[
        str,
        AfterValidator(ValidatorsUtil.empty_string),
        AfterValidator(ValidatorsUtil.to_lowercase)
    ]
    max_retries: int = DEFAULT_MAX_RETRIES


# Handler
class AWSBedrockHandler(LLMHandler):
    DEFAULT_MODEL = AWSBedrockSupportedModels.ANTHROPIC_CLAUDE_3_5_SONNET_20241022_V2_0

    def __init__(self, **kwargs):
        logger.info('Entered <BedrockHandler.init>')

        # Parse configuration from kwargs
        self._config = self.get_config(config=kwargs)

        # Create client
        self._client = AnthropicBedrock(
            base_url=self._config.base_url,
            aws_access_key=self._config.aws_access_key,
            aws_secret_key=self._config.aws_secret_key,
            aws_session_token=self._config.aws_session_token,
            aws_region=self._config.aws_region,
            max_retries=self._config.max_retries
        )
        logger.info('Created AWS Bedrock client')

        logger.info('Exited <BedrockHandler.init>')

    def get_config(self, config: dict) -> AWSBedrockConfig:
        logger.info('Entered <BedrockHandler.get_config>')

        parsed_data, error = safe_parse_pydantic_model(
            model=AWSBedrockConfig,
            data=config
        )
        if bool(error):
            raise Exception(error)

        logger.info('Exited <BedrockHandler.get_config>')
        return parsed_data

    def invoke(self, messages: List[Any], system_prompt: str = None):
        logger.info('Entered <BedrockHandler.invoke>')
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

        logger.info('Exited <BedrockHandler.invoke>')
        return response.content[0].text if len(response.content) > 0 else ''

    def get_model(self):
        logger.info('Entered <BedrockHandler.get_model>')

        model_info = self.DEFAULT_MODEL
        for model in AWSBedrockSupportedModels:
            if model.name == self._config.model_id:
                model_info = model
                break

        logger.info('Exited <BedrockHandler.get_model>')
        return {
            'id': model_info.name,
            'max_tokens': model_info.max_tokens
        }

    def is_valid(self) -> bool:
        logger.info('Entered <BedrockHandler.is_valid>')

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
            logger.error(f'Error validating AWS Bedrock credentials: {e}')

        logger.info('Exited <BedrockHandler.is_valid>')
        return output
