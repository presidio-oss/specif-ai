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
class OllamaConfig(BaseModel):
    base_url: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: (get_env_variable(key=EnvVariables.OLLAMA_BASE_URL) or None)
    )
    model_id: Annotated[
        str,
        AfterValidator(ValidatorsUtil.empty_string)
    ]
    max_retries: int = DEFAULT_MAX_RETRIES


# Handler
class OllamaHandler(LLMHandler):

    def __init__(self, **kwargs):
        logger.info('Entered <OllamaHandler.init>')

        # Parse configuration from kwargs
        self._config = self.get_config(config=kwargs)
        print(f'Config: {self._config}')

        # Create client
        self._client = OpenAI(
            api_key='ollama',
            base_url=self._config.base_url + '/v1',
            max_retries=self._config.max_retries
        )
        logger.info('Created Ollama client')

        logger.info('Exited <OllamaHandler.init>')

    def get_config(self, config: dict) -> OllamaConfig:
        logger.info('Entered <OllamaHandler.get_config>')

        parsed_data, error = safe_parse_pydantic_model(
            model=OllamaConfig,
            data=config
        )
        if bool(error):
            raise Exception(error)

        logger.info('Exited <OllamaHandler.get_config>')
        return parsed_data

    def invoke(self, messages: List[Any], system_prompt: str = None):
        logger.info('Entered <OllamaHandler.invoke>')
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

        logger.info('Exited <OllamaHandler.invoke>')
        return response.choices[0].message.content if len(response.choices) > 0 else ''

    def get_model(self):
        logger.info('Entered <OllamaHandler.get_model>')

        model_id = self._config.model_id

        logger.info('Exited <OllamaHandler.get_model>')
        return {
            'id': model_id or ''
        }

    def is_valid(self) -> bool:
        logger.info('Entered <OllamaHandler.is_valid>')

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
            logger.error(f'Error validating Ollama credentials: {e}')

        logger.info('Exited <OllamaHandler.is_valid>')
        return output
