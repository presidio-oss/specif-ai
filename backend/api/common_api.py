# Third-party imports
from decorators.require_access_token import require_access_code
from flask import Blueprint, request, g, jsonify

# Local application imports
from config.exceptions import CustomAppException
from config.logging_config import logger
from utils.env_utils import EnvVariables, get_env_variable
from utils.llm_utils import LLMUtils
from llm import build_llm_handler

# API Blueprint
common_api = Blueprint('common_api', __name__)

@require_access_code()
@common_api.route('/api/app/config')
def get_analytics_config():
    """
    Endpoint to provide PostHog configuration
    """
    return jsonify({
        'key': get_env_variable(EnvVariables.POSTHOG_KEY),
        'host': get_env_variable(EnvVariables.POSTHOG_HOST)
    })

@common_api.route("/api/llm-config/defaults", methods=["GET"])
def get_default_llm_config():
    logger.info("Entered <get_default_llm_config>")
    try:
        default_config = {
            "provider": get_env_variable(EnvVariables.DEFAULT_API_PROVIDER),
            "model": get_env_variable(EnvVariables.DEFAULT_MODEL)
        }
        logger.info(f"Default LLM configuration: {default_config}")
        return jsonify(default_config)
    except Exception as e:
        logger.error(f"An error occurred while fetching default LLM configuration: {str(e)}")
        raise CustomAppException("Failed to fetch default LLM configuration", status_code=500) from e
    finally:
        logger.info("Exited <get_default_llm_config>")


@common_api.route("/api/model/config-verification", methods=["POST"])
def verify_provider_config():
    logger.info("Entered <provider_config_verification>")
    try:
        data = request.get_json()
        g.current_provider = data.get('provider')
        g.current_model = data.get('model')

        if not g.current_provider or not g.current_model:
            raise CustomAppException("Provider and model are required", status_code=400)

        # Make a test call to the LLM with a simple prompt
        test_prompt = "This is a test prompt to verify the provider configuration."

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(prompt=test_prompt)

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        result = llm_handler.invoke(messages=llm_message)

        response = {
            "status": "success",
            "message": "Provider configuration verified successfully",
            "provider": g.current_provider,
            "model": g.current_model,
            "test_response": result
        }
        logger.info(f"Provider configuration verified successfully for {g.current_provider}:{g.current_model}")

    except CustomAppException as e:
        logger.error(f"In <provider_config_verificationg>, Provider configuration verification failed: {str(e)}")
        response = {
            "status": "failed",
            "message": "Model connection failed. Please validate the credentials.",
            "provider": g.current_provider,
            "model": g.current_model
        }
        return jsonify(response)
    except Exception as e:
        logger.error(f"An unexpected error occurred during provider verification: {str(e)}")
        raise CustomAppException(f"Provider configuration verification failed: {str(e)}", status_code=500) from e

    logger.info("Exited <provider_config_verification>")
    return jsonify(response)
