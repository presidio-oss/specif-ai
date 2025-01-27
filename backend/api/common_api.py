from llm.llm_service import LLMService
from flask import Blueprint, request, g, jsonify
from config.exceptions import CustomAppException
from config.logging_config import logger
from utils.env_utils import EnvVariables, get_env_variable

common_api = Blueprint('common_api', __name__)
llMService = LLMService()

@common_api.route("/api/hello", methods=["GET"])
def test():
    logger.info("Entered <test>")
    try:
        response = {"LLM": llMService.current_llm()}
        logger.info("Response: %s", response)
    except Exception as e:
        logger.error("An unexpected error occurred: %s", str(e))
        raise CustomAppException(f"An error occurred: {str(e)}", status_code=500) from e
    logger.info("Exited <test>")
    return jsonify(response)

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
        result = llMService.call_llm(test_prompt)

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
