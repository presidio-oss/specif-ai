from flask import g
from config.exceptions import CustomAppException
from config.logging_config import logger
from llm.chat_agent import ChatAgent
from utils.common_utils import add_knowledge_base_to_prompt
from llm.multi_model_router import multiModalRouter
from utils.env_utils import get_env_variable, EnvVariables

class LLMService:
    """
    LLMService is a singleton class responsible for handling interactions with the Language Model.
    It provides methods to call the LLM with or without chat history and knowledge base integration.
    """
    _instance = None
    chat_agent_service = ChatAgent()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(LLMService, cls).__new__(cls)
        return cls._instance

    def _prepare_messages(self, prompt, chat_history=None, system_message=None):
        """
        Prepare messages for the LLM with optional chat history and system message.

        :param prompt: The main prompt to be sent to the LLM.
        :param chat_history: Optional list of previous chat messages.
        :param system_message: Optional system message to guide the LLM.
        :return: A list of message dictionaries formatted for the LLM.
        """
        messages = []

        if not(bool(prompt) and isinstance(prompt, str)):
            raise CustomAppException("Invalid prompt provided.", status_code=400)
        if bool(system_message) and isinstance(system_message, str):
            messages.append({"role": "system", "content": system_message})
        if bool(chat_history) and isinstance(chat_history, list):
            for chat in chat_history:
                for key, value in chat.items():
                    messages.append({"role": key, "content": value})
        
        messages.append({"role": "user", "content": prompt})
        return messages

    def call_llm(self, prompt, knowledge_base: str = None):
        """
        Call the LLM with a given prompt and optional knowledge base.

        :param prompt: The prompt to be sent to the LLM.
        :param knowledge_base: Optional knowledge base to enhance the prompt.
        :return: The result from the LLM.
        :raises CustomAppException: If an error occurs during the LLM call.
        """
        try:
            if knowledge_base:
                logger.info(f"Request {g.request_id}: Using Knowledge Base")
                prompt = add_knowledge_base_to_prompt(prompt, knowledge_base)

            messages = self._prepare_messages(prompt)

            logger.info(f"Request {g.request_id}: <call_llm> Invoking with provider = {g.current_provider}")
            logger.info(f"Request {g.request_id}: <call_llm> Invoking with model = {g.current_model}")

            result = multiModalRouter.execute(prompt=messages, provider=g.current_provider, model=g.current_model)

            logger.info(f"Request {g.request_id}: <call_llm> LLM response received successfully")
            logger.info(f"Request {g.request_id}: Exited <call_llm>")
            return result

        except Exception as e:
            logger.error(f"Request {g.request_id}: LLM error occurred: {str(e)}")
            raise CustomAppException(
                message="Failed to get a response from LLM", status_code=500
            )
    
    def call_llm_for_chat_agent(self, prompt, chat_history: list = None, knowledge_base: str = None, system_message: str = None): 
        """
        Call the LLM for a chat agent with a given prompt, chat history, and optional knowledge base and system message.

        :param prompt: The prompt to be sent to the LLM.
        :param chat_history: Optional list of previous chat messages.
        :param knowledge_base: Optional knowledge base to enhance the prompt.
        :param system_message: Optional system message to guide the LLM.
        :return: The result from the LLM.
        :raises CustomAppException: If an error occurs during the LLM call.
        """
        try:
            if knowledge_base:
                logger.info(f"Request {g.request_id}: Using Knowledge Base")
                prompt = add_knowledge_base_to_prompt(prompt, knowledge_base)

            messages = self._prepare_messages(prompt, chat_history, system_message)
            
            logger.info(f"Request {g.request_id}: <call_llm_for_chat_agent> Invoking with provider = {g.current_provider}")
            logger.info(f"Request {g.request_id}: <call_llm_for_chat_agent> Invoking with model = {g.current_model}")

            result = multiModalRouter.execute(prompt=messages, provider=g.current_provider, model=g.current_model)

            logger.info(f"Request {g.request_id}: <call_llm_for_chat_agent> LLM response received successfully")
            logger.info(f"Request {g.request_id}: Exited <call_llm_for_chat_agent>")
            return result
        except Exception as e:
            logger.error(f"Request {g.request_id}: LLM error occurred: {str(e)}")
            raise CustomAppException(
                message="Failed to get a response from LLM", status_code=500
            )


    def current_llm(self):
        """
        Get the current LLM provider and model being used.

        :return: A string describing the current API provider and model.
        """
        return f"Default API Provider:{g.current_provider if g.current_provider else get_env_variable(EnvVariables.DEFAULT_API_PROVIDER)} - Default Model: {g.current_provider if g.current_provider else get_env_variable(EnvVariables.DEFAULT_MODEL)}"
