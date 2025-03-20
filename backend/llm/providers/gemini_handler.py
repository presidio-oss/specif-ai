# Standard library imports
import re
from enum import Enum

# Third-party imports
from typing import List, Any, Optional
from typing_extensions import Annotated
from google import genai
from google.genai.types import UserContent, ModelContent, GenerateContentConfig
from pydantic import BaseModel, AfterValidator, Field

# Local application imports
from llm.providers import LLMHandler
from utils.env_utils import EnvVariables, get_env_variable
from utils.validator_utils import ValidatorsUtil
from utils.common_utils import safe_parse_pydantic_model
from config.logging_config import logger


# LLM specific configuration
class GeminiConfig(BaseModel):
    api_key: Optional[Annotated[str, AfterValidator(ValidatorsUtil.empty_string)]] = Field(
        default_factory=lambda: (get_env_variable(key=EnvVariables.GEMINI_API_KEY) or None)
    )
    model_id: Annotated[
        str,
        AfterValidator(ValidatorsUtil.empty_string),
        AfterValidator(ValidatorsUtil.to_lowercase)
    ]


class GeminiSupportedModel(Enum):
    GEMINI_2_0_FLASH_001 = 'gemini-2.0-flash-001'
    GEMINI_2_0_FLASH_LITE_PREVIEW_02_05 = 'gemini-2.0-flash-lite-preview-02-05'
    GEMINI_2_0_PRO_EXP_02_05 = 'gemini-2.0-pro-exp-02-05'
    GEMINI_2_0_FLASH_THINKING_EXP_01_21 = 'gemini-2.0-flash-thinking-exp-01-21'
    GEMINI_2_0_FLASH_THINKING_EXP_1219 = 'gemini-2.0-flash-thinking-exp-1219'
    GEMINI_2_0_FLASH_EXP = 'gemini-2.0-flash-exp'
    GEMINI_1_5_FLASH_002 = 'gemini-1.5-flash-002'
    GEMINI_1_5_FLASH_EXP_0827 = 'gemini-1.5-flash-exp-0827'
    GEMINI_1_5_FLASH_8B_EXP_0827 = 'gemini-1.5-flash-8b-exp-0827'
    GEMINI_1_5_PRO_002 = 'gemini-1.5-pro-002'
    GEMINI_1_5_PRO_EXP_0827 = 'gemini-1.5-pro-exp-0827'
    GEMINI_EXP_1206 = 'gemini-exp-1206'


# Handler
class GeminiHandler(LLMHandler):
    DEFAULT_MODEL_ID = GeminiSupportedModel.GEMINI_2_0_FLASH_001.value

    def __init__(self, **kwargs):
        logger.info('Entered <GeminiHandler.init>')

        # Parse configuration from kwargs
        self._config = self.get_config(config=kwargs)

        # Create client
        self._client = genai.Client(
            api_key=self._config.api_key
        )
        logger.info('Created Gemini client')

        logger.info('Exited <GeminiHandler.init>')

    def get_config(self, config: dict) -> GeminiConfig:
        logger.info('Entered <GeminiHandler.get_config>')

        parsed_data, error = safe_parse_pydantic_model(
            model=GeminiConfig,
            data=config
        )
        if bool(error):
            raise Exception(error)

        logger.info('Exited <GeminiHandler.get_config>')
        return parsed_data

    def invoke(self, messages: List[Any], system_prompt: str = None):
        logger.info('Entered <GeminiHandler.invoke>')
        system_prompt = (system_prompt or '').strip()

        chat_messages = [
            UserContent(message['content']) if message['role'] == 'user' else ModelContent(message['content'])
            for message in messages
            if bool(message) and ('role' in message) and ('content' in message)
        ]

        config = None
        if bool(system_prompt):
            config = GenerateContentConfig(
                system_instruction=system_prompt
            )

        # TODO: Handle stream
        response = self._client.models.generate_content(
            model=self.get_model()['id'],
            contents=chat_messages,
            config=config
        )
        output = response.text

        match = re.search(r"```json\n(.*?)\n```", output, re.DOTALL)
        if match:
            output = match.group(1)

        logger.info(f'Exited <GeminiHandler.invoke>')
        return output

    def get_model(self):
        logger.info('Entered <GeminiHandler.get_model>')

        model_id = self._config.model_id
        model_list = [model.value for model in GeminiSupportedModel]

        logger.info('Exited <GeminiHandler.get_model>')
        return {
            'id': model_id if (model_id in model_list) else self.DEFAULT_MODEL_ID
        }

    def is_valid(self) -> bool:
        logger.info('Entered <GeminiHandler.is_valid>')

        output = False
        try:
            self._client.models.generate_content(
                model=self.get_model()['id'],
                contents='Test',
                config=GenerateContentConfig(
                    temperature=0,
                    max_output_tokens=1
                )
            )
            output = True
        except Exception as e:
            logger.error(f'Error validating Gemini credentials: {e}')

        logger.info('Exited <GeminiHandler.is_valid>')
        return output
