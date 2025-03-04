# Standard library imports
from enum import Enum

# Third-party imports
from typing import List, Any, Optional
from typing_extensions import Annotated
from openai import OpenAI, DEFAULT_MAX_RETRIES
from pydantic import BaseModel, AfterValidator, Field

# Local application imports
from llm.providers import LLMHandler
from utils.env_utils import EnvVariables, get_env_variable
from utils.validator_utils import ValidatorsUtil
from utils.common_utils import safe_parse_pydantic_model
from config.logging_config import logger


# LLM specific configuration
class OpenAINativeConfig(BaseModel):
    api_key: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: (get_env_variable(key=EnvVariables.OPENAI_API_KEY) or None)
    )
    model_id: Annotated[
        str,
        AfterValidator(ValidatorsUtil.empty_string),
        AfterValidator(ValidatorsUtil.to_lowercase)
    ]
    max_retries: int = DEFAULT_MAX_RETRIES


class OpenAINativeSupportedModel(Enum):
    GPT_4O = 'gpt-4o'
    GPT_4O_MINI = 'gpt-4o-mini'


# Handler
class OpenAINativeHandler(LLMHandler):
    DEFAULT_MODEL_ID = OpenAINativeSupportedModel.GPT_4O.value

    def __init__(self, **kwargs):
        logger.info('Entered <OpenAINativeHandler.init>')

        # Parse configuration from kwargs
        self._config = self.get_config(config=kwargs)

        # Create client
        self._client = OpenAI(
            api_key=self._config.api_key,
            max_retries=self._config.max_retries
        )
        logger.info('Created OpenAI client')

        logger.info('Exited <OpenAINativeHandler.init>')

    def get_config(self, config: dict) -> OpenAINativeConfig:
        parsed_data, error = safe_parse_pydantic_model(
            model=OpenAINativeConfig,
            data=config
        )
        if bool(error):
            raise Exception(error)

        return parsed_data

    def invoke(self, messages: List[Any], system_prompt: str = None):
        logger.info('Entered <OpenAINativeHandler.invoke>')
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

        logger.info('Exited <OpenAINativeHandler.invoke>')
        return response.choices[0].message.content if len(response.choices) > 0 else ''

    def get_model(self):
        logger.info('Entered <OpenAINativeHandler.get_model>')

        model_id = self._config.model_id
        model_list = [model.value for model in OpenAINativeSupportedModel]

        logger.info('Exited <OpenAINativeHandler.get_model>')
        return {
            'id': model_id if (model_id in model_list) else self.DEFAULT_MODEL_ID
        }

    def is_valid(self) -> bool:
        logger.info('Entered <OpenAINativeHandler.is_valid>')

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
            logger.error(f'Error validating OpenAI Native credentials: {e}')

        logger.info('Exited <OpenAINativeHandler.is_valid>')
        return output
