# Standard library imports
from abc import ABC, abstractmethod

# Third-party imports
from typing import List, Any


# Abstract base class for LLM provider implementation
class LLMHandler(ABC):
    """
    Abstract base class for handling different LLM providers.
    Subclasses must implement the required methods to define provider-specific behavior.
    """

    @abstractmethod
    def invoke(self, messages: List[Any], system_prompt: str = None) -> str:
        """
        Executes the LLM request.
        This method should be implemented by subclasses to process the input
        and generate a response using the corresponding LLM provider.
        Args:
            messages (List[Any]): A list of input messages for the LLM.
            system_prompt (str, optional): An optional system-level prompt to guide the response.
        Returns:
            str: The generated response from the LLM.
        """
        pass

    @abstractmethod
    def get_config(self, config: dict):
        """
        Parses the LLM configuration from the provided dictionary.
        This method should be implemented by subclasses to extract relevant
        configuration parameters required for the LLM provider.
        Args:
            config (dict): A dictionary containing LLM-specific configuration details.
        Returns:
            Any: LLM specific configuration object
        """
        pass

    @abstractmethod
    def get_model(self):
        """
        Retrieves the model information for the LLM provider.
        Returns:
            Any: Model identifier or configuration details specific to the provider.
        """
        pass

    @abstractmethod
    def is_valid(self) -> bool:
        """
        Checks if the LLM configuration is valid
        Returns:
            bool: True if the configuration is valid, False otherwise.
        """
        pass
