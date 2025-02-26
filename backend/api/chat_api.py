# Standard library imports
import json

# Third-party imports
from flask import request, jsonify, g, Blueprint
from marshmallow import ValidationError

# Local application imports
from decorators.require_access_token import require_access_code
from config.exceptions import CustomAppException
from config.logging_config import logger
from utils.common_utils import render_template, get_template_env
from utils.llm_utils import LLMUtils
from schemas.schemas import (
    chat_generic_schema,
    chat_improve_suggestion_schema,
    chat_update_requirement_schema,
    chat_update_user_story_schema
)
from llm.prompts import (
    p_chat_improved_suggestions,
)
from llm import build_llm_handler


chat_api = Blueprint('chat_api', __name__)
jinja_template_env = get_template_env()


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
    knowledge_base = data.get("knowledgeBase", "").strip()

    # Generate knowledge base constraint prompt
    base_prompt = message
    if bool(knowledge_base):
        base_prompt = LLMUtils.generate_knowledge_base_prompt_constraint(
            knowledge_base_id=knowledge_base,
            prompt=base_prompt
        )

    # Prepare message for LLM
    llm_message = LLMUtils.prepare_messages(
        prompt=base_prompt,
        chat_history=data.get("chatHistory", [])
    )

    # Invoke LLM
    llm_handler = build_llm_handler(
        provider=g.current_provider,
        model_id=g.current_model
    )
    response = llm_handler.invoke(messages=llm_message)

    logger.info(f"Request {g.request_id}: Exited <chat_generic>")
    return jsonify(response)


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
    knowledge_base = data.get("knowledgeBase", "").strip()
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

    # Generate knowledge base constraint prompt
    base_prompt = template
    if bool(knowledge_base):
        base_prompt = LLMUtils.generate_knowledge_base_prompt_constraint(
            knowledge_base_id=knowledge_base,
            prompt=base_prompt
        )

    # Prepare message for LLM
    llm_message = LLMUtils.prepare_messages(
        prompt=base_prompt
    )

    # Invoke LLM
    llm_handler = build_llm_handler(
        provider=g.current_provider,
        model_id=g.current_model
    )
    response = llm_handler.invoke(messages=llm_message)

    try:
        llm_response_list = json.loads(response)
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": response},
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
    knowledge_base = data.get('knowledgeBase', '').strip()
    system_prompt = template.render(
        name=data["name"],
        description=data["description"],
        type=data["type"],
        r_abbr=data["requirementAbbr"],
        requirement=requirement,
    )
    chat_history = data.get("chatHistory", [])
    try:
        # Generate knowledge base constraint prompt
        base_prompt = user_message
        if bool(knowledge_base):
            base_prompt = LLMUtils.generate_knowledge_base_prompt_constraint(
                knowledge_base_id=knowledge_base,
                prompt=base_prompt
            )

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(
            prompt=base_prompt,
            chat_history=chat_history
        )

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        response = llm_handler.invoke(messages=llm_message, system_prompt=system_prompt)

        logger.info(f"Request {g.request_id}: Exited <chat_update_requirement>")
        return jsonify(response)
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
    knowledge_base = data.get('knowledgeBase', '').strip()
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

    # Generate knowledge base constraint prompt
    base_prompt = user_message
    if bool(knowledge_base):
        base_prompt = LLMUtils.generate_knowledge_base_prompt_constraint(
            knowledge_base_id=knowledge_base,
            prompt=base_prompt
        )

    # Prepare message for LLM
    llm_message = LLMUtils.prepare_messages(
        prompt=base_prompt,
        chat_history=chat_history
    )

    # Invoke LLM
    llm_handler = build_llm_handler(
        provider=g.current_provider,
        model_id=g.current_model
    )
    response = llm_handler.invoke(messages=llm_message, system_prompt=system_prompt)

    logger.info(f"Request {g.request_id}: Exited <chat_update_user_story_task>")
    return jsonify(response)
