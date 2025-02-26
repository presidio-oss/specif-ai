# Third-party imports
from typing import List, Any, Optional
from typing_extensions import Annotated
from openai import OpenAI, AzureOpenAI, DEFAULT_MAX_RETRIES
from pydantic import BaseModel, AfterValidator, Field

# Local application imports
from llm.providers import LLMHandler
from utils.env_utils import EnvVariables, get_env_variable
from utils.validator_utils import ValidatorsUtil
from utils.common_utils import safe_parse_pydantic_model
from config.logging_config import logger


# LLM specific configuration
class OpenAIConfig(BaseModel):
    base_url: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: get_env_variable(key=EnvVariables.OPENAI_BASE_URL)
    )
    api_key: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: get_env_variable(key=EnvVariables.OPENAI_API_KEY)
    )
    azure_api_key: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: get_env_variable(key=EnvVariables.AZURE_OPENAI_API_KEY)
    )
    api_version: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: get_env_variable(key=EnvVariables.OPENAI_API_VERSION)
    )
    model_id: Annotated[
        str,
        AfterValidator(ValidatorsUtil.empty_string),
        AfterValidator(ValidatorsUtil.to_lowercase)
    ]
    max_retries: int = DEFAULT_MAX_RETRIES


# Handler
class OpenAIHandler(LLMHandler):

    def __init__(self, **kwargs):
        logger.info('Entered <OpenAIHandler.init>')

        # Parse configuration from kwargs
        self._config = self.get_config(config=kwargs)

        # Create client
        if 'azure.com' in self._config.base_url.lower():
            self._client = AzureOpenAI(
                azure_endpoint=self._config.base_url,
                api_key=self._config.azure_api_key,
                azure_deployment=self._config.model_id,
                api_version=self._config.api_version,
                max_retries=self._config.max_retries
            )
            logger.info('Created Azure OpenAI client')
        else:
            self._client = OpenAI(
                base_url=self._config.base_url,
                api_key=self._config.api_key,
                max_retries=self._config.max_retries
            )
            logger.info('Created OpenAI client')

        logger.info('Exited <OpenAIHandler.init>')

    def get_config(self, config: dict) -> OpenAIConfig:
        logger.info('Entered <OpenAIHandler.get_config>')

        parsed_data, error = safe_parse_pydantic_model(
            model=OpenAIConfig,
            data=config
        )
        if bool(error):
            raise Exception(error)

        logger.info('Exited <OpenAIHandler.get_config>')
        return parsed_data

    def invoke(self, messages: List[Any], system_prompt: str = None):
        logger.info('Entered <OpenAIHandler.invoke>')
        system_prompt = (system_prompt or '').strip()

        chat_messages = []
        if bool(system_prompt):
            chat_messages = [{'role': 'system', 'content': system_prompt}]
        chat_messages.extend(messages)

        # TODO: Handle stream
        response = self._client.chat.completions.create(
            model=self.get_model()['id'],
            messages=chat_messages,
            stream=False
        )

        logger.info('Exited <OpenAIHandler.invoke>')
        return response.choices[0].message.content if len(response.choices) > 0 else ''

    def get_model(self):
        logger.info('Entered <OpenAIHandler.get_model>')

        model_id = self._config.model_id

        logger.info('Exited <OpenAIHandler.get_model>')
        return {
            'id': model_id or ''
        }

    def is_valid(self) -> bool:
        logger.info('Entered <OpenAIHandler.is_valid>')

        output = False
        try:
            self._client.chat.completions.create(
                model=self.get_model()['id'],
                max_tokens=1,
                messages=[{'role': 'user', 'content': 'Test'}],
                temperature=0,
                stream=False
            )
            output = True
        except Exception as e:
            logger.error(f'Error validating OpenAI credentials: {e}')

        logger.info('Exited <OpenAIHandler.is_valid>')
        return output
