import os
from enum import Enum

# Define an Enum for environment variable keys
class EnvVariables(Enum):
    # Default LLM provider and model
    DEFAULT_API_PROVIDER = "DEFAULT_API_PROVIDER"
    DEFAULT_MODEL = "DEFAULT_MODEL"

    # OpenAI
    AZURE_OPENAI_API_KEY = "AZURE_OPENAI_API_KEY"
    OPENAI_API_VERSION = "OPENAI_API_VERSION"
    OPENAI_API_KEY = "OPENAI_API_KEY"
    OPENAI_BASE_URL = 'OPENAI_BASE_URL'

    # Anthropic
    ANTHROPIC_BASE_URL = 'ANTHROPIC_BASE_URL'
    ANTHROPIC_API_KEY = 'ANTHROPIC_API_KEY'

    # AWS Bedrock
    ANTHROPIC_BEDROCK_BASE_URL = 'ANTHROPIC_BEDROCK_BASE_URL'
    AWS_BEDROCK_ACCESS_KEY = 'AWS_BEDROCK_ACCESS_KEY'
    AWS_BEDROCK_SECRET_KEY = 'AWS_BEDROCK_SECRET_KEY'
    AWS_BEDROCK_SESSION_TOKEN = 'AWS_BEDROCK_SESSION_TOKEN'
    AWS_BEDROCK_REGION = 'AWS_BEDROCK_REGION'

    # App related envs
    APP_PASSCODE_KEY = "APP_PASSCODE_KEY"
    HOST = "HOST"
    PORT = "PORT"
    DEBUG = "DEBUG"
    ENABLE_SENTRY = "ENABLE_SENTRY"
    SENTRY_DSN = "SENTRY_DSN"
    SENTRY_ENVIRONMENT = "SENTRY_ENVIRONMENT"
    SENTRY_RELEASE = "SENTRY_RELEASE"
    AWS_REGION = 'AWS_REGION'

# Define a dictionary for default values
DEFAULT_VALUES = {
    # Default LLM provider and model
    EnvVariables.DEFAULT_API_PROVIDER: "openai",
    EnvVariables.DEFAULT_MODEL: "gpt-4o",

    # OpenAI
    EnvVariables.OPENAI_API_VERSION: "2024-08-01-preview",

    # AWS Bedrock
    EnvVariables.AWS_BEDROCK_REGION: 'us-west-1',

    # App related defaults
    EnvVariables.APP_PASSCODE_KEY: "",
    EnvVariables.HOST: "0.0.0.0",
    EnvVariables.PORT: 5001,
    EnvVariables.DEBUG: False,
    EnvVariables.ENABLE_SENTRY: False,
    EnvVariables.SENTRY_DSN: "",
    EnvVariables.SENTRY_ENVIRONMENT: "",
    EnvVariables.SENTRY_RELEASE: "",
    EnvVariables.AWS_REGION: 'us-east-1',
}


def get_env_variable(key: EnvVariables):
    """Retrieve an environment variable or return its default value."""
    return os.getenv(key.value, DEFAULT_VALUES[key] if (key in DEFAULT_VALUES) else None)
