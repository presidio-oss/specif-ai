import json
from flask import request, jsonify, g, Blueprint
from marshmallow import ValidationError
from decorators.require_access_token import require_access_code
from config.exceptions import CustomAppException
from config.logging_config import logger
from utils.common_utils import render_template, get_template_env
from llm.llm_service import LLMService
from schemas.schemas import (
    chat_generic_schema,
    chat_improve_suggestion_schema,
    chat_update_requirement_schema,
    chat_update_user_story_schema
)
from llm.prompts import (
    p_chat_improved_suggestions,
)


chat_api = Blueprint('chat_api', __name__)
jinja_template_env = get_template_env()
llm_service = LLMService()  # Singleton instance of LLMService

@chat_api.route("/api/chat/generic", methods=["POST"])
@require_access_code()
def chat_generic():
    logger.info(f"Request {g.request_id}: Entered <chat_generic>")
    try:
        data = chat_generic_schema.load(request.get_json())
    except ValidationError as err:
        logger.error(f"Request {g.request_id}: Payload validation failed: {err.messages}")
        raise CustomAppException("Payload validation failed.", status_code=400) from err

    message = data['message']
    knowledge_base = data.get("knowledgeBase", "")

    llm_response = llm_service.call_llm_for_chat_agent(
        prompt=message, chat_history=data.get("chatHistory", []), system_message=None, knowledge_base=knowledge_base
    )
    logger.info(f"Request {g.request_id}: Exited <chat_generic>")
    return jsonify(llm_response)


@chat_api.route("/api/chat/get_suggestions", methods=["POST"])
@require_access_code()
def get_suggestions():
    """To give improved suggestions for the selected requirement"""
    logger.info(f"Request {g.request_id}: Entered <get_suggestions>")
    try:
        data = chat_improve_suggestion_schema.load(request.get_json())
    except ValidationError as err:
        logger.error(f"Request {g.request_id}: Payload validation failed: {err.messages}")
        raise CustomAppException("Payload validation failed.", status_code=400) from err
    knowledge_base = data.get("knowledgeBase", "")
    llm_response_list = []
    template = render_template(p_chat_improved_suggestions)
    template = template.render(
        n="3",
        name=data["name"],
        description=data["description"],
        type=data["type"],
        requirement=data["requirement"],
        suggestions=data["suggestions"],
        selectedSuggestion=data["selectedSuggestion"],
    )
    llm_response = llm_service.call_llm(template, knowledge_base=knowledge_base)

    try:
        llm_response_list = json.loads(llm_response)
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": llm_response},
        ) from exc
    logger.info(f"Request {g.request_id}: Exited <get_suggestions>")
    return llm_response_list


@chat_api.route("/api/chat/update_requirement", methods=["POST"])
@require_access_code()
def chat_update_requirement():
    """Based on the type and app, helps to build requirement over conversation"""
    logger.info(f"Request {g.request_id}: Entered <chat_update_requirement>")
    try:
        data = chat_update_requirement_schema.load(request.get_json())
    except ValidationError as err:
        logger.error(f"Request {g.request_id}: Payload validation failed: {err.messages}")
        raise CustomAppException("Payload validation failed.", status_code=400) from err

    template = jinja_template_env.get_template('update_requirement.jinja2')
    requirement = data["requirement"]
    user_message = data["userMessage"]
    knowledge_base = data.get('knowledgeBase', '')
    system_prompt = template.render(
        name=data["name"],
        description=data["description"],
        type=data["type"],
        r_abbr=data["requirementAbbr"],
        requirement=requirement,
    )
    chat_history = data.get("chatHistory", [])
    try:
        llm_response = llm_service.call_llm_for_chat_agent(
            prompt=user_message, chat_history=chat_history, system_message=system_prompt, knowledge_base=knowledge_base
        )
        logger.info(f"Request {g.request_id}: Exited <chat_update_requirement>")
        return jsonify(llm_response)
    except Exception as e:
        logger.info("Exited <chat_update_requirement>")
        logger.error(e)
        raise CustomAppException("Something went wrong. Please try again.", status_code=500) from e

@chat_api.route("/api/chat/update_user_story_task", methods=["POST"])
@require_access_code()
def chat_update_user_story_task():
    """Based on the type and app, helps to build requirement over conversation"""
    logger.info(f"Request {g.request_id}: Entered <chat_update_user_story_task>")
    try:
        data = chat_update_user_story_schema.load(request.get_json())
    except ValidationError as err:
        logger.error(f"Request {g.request_id}: Payload validation failed: {err.messages}")
        raise CustomAppException("Payload validation failed.", status_code=400) from err
    template = jinja_template_env.get_template('update_user_story_task.jinja2')
    requirement = data["requirement"]
    user_message = data["userMessage"]
    knowledge_base = data.get('knowledgeBase', '')
    prd = data.get('prd', '')
    us = data.get('us', '')
    system_prompt = template.render(
        name=data["name"],
        description=data["description"],
        type=data["type"],
        requirement=requirement,
        prd=prd,
        us=us
    )
    chat_history = data.get("chatHistory", [])

    llm_response = llm_service.call_llm_for_chat_agent(
        prompt=user_message, chat_history=chat_history, system_message=system_prompt, knowledge_base=knowledge_base
    )
    logger.info(f"Request {g.request_id}: Exited <chat_update_user_story_task>")
    return jsonify(llm_response)
