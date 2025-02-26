# Standard library imports
import json
import concurrent.futures

# Third-party imports
from flask import abort, request, g, Blueprint
from marshmallow import ValidationError
from langchain_aws.retrievers import AmazonKnowledgeBasesRetriever

# Local application imports
from decorators.require_access_token import require_access_code
from config.exceptions import CustomAppException
from config.logging_config import logger
from utils.common_utils import render_template, get_template_env
from utils.llm_utils import LLMUtils
from llm.prompts import (
    p_process_flow_chart,
    p_add_business_process,
    p_update_business_process,
    p_update_user_story,
    p_add_task,
    p_update_task,
)
from llm import build_llm_handler
from schemas.schemas import (
    create_process_flow_chart_schema,
)
from config.executor import ExecutorConfig


solution_api = Blueprint('solution_api', __name__)
jinja_template_env = get_template_env()


@solution_api.route("/api/solutions/flowchart", methods=["POST"])
@require_access_code()
def create_process_flow_chart():
    logger.info(f"Request {g.request_id}: Entered <create_process_flow_chart>")
    response = None

    try:
        data = create_process_flow_chart_schema.load(request.get_json())
        process_flow_template = render_template(p_process_flow_chart)
        BRDS = "\n".join(data["selectedBRDs"])
        PRDS = "\n".join(data["selectedPRDs"])
        process_flow_req = process_flow_template.render(title=data["title"], description=data["description"], BRDS=BRDS, PRDS=PRDS,)

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(prompt=process_flow_req)

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        response = llm_handler.invoke(messages=llm_message)

        parsed_res = json.dumps(response)
    except ValidationError as err:
        logger.error(f"Request {g.request_id}: Payload validation failed: {err.messages}")
        raise CustomAppException("Payload validation failed.", status_code=400) from err
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"features": response},
        ) from exc
    flow_chart_data = parsed_res
    logger.info(f"Request {g.request_id}: Exited <create_process_flow_chart>")
    return flow_chart_data


# Create solutions without yaml
@solution_api.route("/api/solutions/create", methods=["POST"])
@require_access_code()
def create_solutions():
    logger.info(f"Request {g.request_id}: Entered <create_solutions>")
    data = request.get_json()
    final_llm_response_dict = {}
    errors = []
    templates = []

    def get_llm_response(template_path):
        logger.info(f"Request {g.request_id}: Fetching LLM response for template: {template_path}")
        template = jinja_template_env.get_template(template_path)
        template = template.render(name=data["name"], description=data["description"])
        try:
            # Prepare message for LLM
            llm_message = LLMUtils.prepare_messages(prompt=template)

            # Invoke LLM
            llm_handler = build_llm_handler(
                provider=g.current_provider,
                model_id=g.current_model
            )
            llm_response = llm_handler.invoke(messages=llm_message)

            logger.info(f"Request {g.request_id}: Successfully received LLM response for template: {template_path}")
            return json.loads(llm_response)
        except json.JSONDecodeError:
            logger.error(f"Request {g.request_id}: Failed to parse LLM response for template: {template_path}")
            abort(500, description="Invalid JSON format. Please try again.")

    if data["createReqt"]:
        logger.info(f"Request {g.request_id}: Creating requirements using LLM")
        clean_solution = data['cleanSolution'] if ('cleanSolution' in data) and isinstance(data['cleanSolution'],
                                                                                           bool) else False
        if clean_solution is False:
            templates = ['create_brd.jinja2', 'create_prd.jinja2', 'create_nfr.jinja2', 'create_uir.jinja2']
        executor = ExecutorConfig().get_executor()
        futures = [executor.submit(get_llm_response, template) for template in templates]
        for future in concurrent.futures.as_completed(futures):
            try:
                llm_response_dict = future.result()
                final_llm_response_dict.update(llm_response_dict)
            except Exception as e:
                logger.exception(f"Request {g.request_id}: Error in one or more LLM responses: {str(e)}")
                import traceback
                errors.append(traceback.format_exc())
                traceback.print_exc()
                raise CustomAppException("Error in one or more LLM responses", status_code=500, payload={"errors": errors})

    merged_data = {**data, **final_llm_response_dict}
    logger.info(f"Request {g.request_id}: Exited <create_solutions_withoutyaml> successfully")
    return merged_data


@solution_api.route("/api/solutions/update", methods=["POST"])
@require_access_code()
def update_solution_reqt():
    logger.info(f"Request {g.request_id}: Entered <update_solution_reqt>")
    data = request.get_json()
    llm_response_dict = {}  # Initialize the variable here
    template = jinja_template_env.get_template('02_update.jinja2')
    updatedReqt = data["updatedReqt"]
    fileContent = data["fileContent"]
    if data["useGenAI"] or fileContent:
        template = template.render(
            name=data["name"],
            description=data["description"],
            existingReqt=data["reqDesc"],
            fileContent=fileContent,
            updatedReqt=updatedReqt,
            reqId=data["reqId"],
            addReqtType=data["addReqtType"]
        )

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(prompt=template)

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        llm_response = llm_handler.invoke(messages=llm_message)
    else:
        updatedReqt = f'{updatedReqt} {data["reqDesc"]}'
        llm_response = json.dumps(
            {"updated": {"title": data["title"], "requirement": updatedReqt}}
        )
    try:
        llm_response_dict = json.loads(llm_response)
        logger.info(f"Request {g.request_id}: Successfully updated solution")
    except json.JSONDecodeError as e:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": llm_response},
        ) from e

    merged_data = {**data, **llm_response_dict}
    logger.info(f"Request {g.request_id}: Exited <update_solution_reqt> successfully")
    return merged_data


@solution_api.route("/api/solutions/add", methods=["POST"])
@require_access_code()
def add_solution_reqt():
    logger.info(f"Request {g.request_id}: Entered <add_solution_reqt>")
    data = request.get_json()
    llm_response_dict = {}  # Initialize the variable here
    template = jinja_template_env.get_template('03_add.jinja2')
    newReqt = data["reqt"]
    fileContent = data["fileContent"]
    if data["useGenAI"] or fileContent:
        template = template.render(
            name=data["name"],
            description=data["description"],
            newReqt=newReqt,
            fileContent=fileContent,
            addReqtType=data["addReqtType"],
        )

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(prompt=template)

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        llm_response = llm_handler.invoke(messages=llm_message)
    else:
        llm_response = json.dumps(
            {"LLMreqt": {"title": data["title"], "requirement": newReqt}}
        )
    try:
        llm_response_dict = json.loads(llm_response)
        logger.info(f"Request {g.request_id}: Successfully added solution requirement")
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": llm_response},
        ) from exc
    merged_data = {**data, **llm_response_dict}
    logger.info(f"Request {g.request_id}: Exited <add_solution_reqt>")
    return merged_data


@solution_api.route("/api/solutions/stories", methods=["POST"])
@require_access_code()
def create_stories():
    logger.info(f"Request {g.request_id}: Entered <create_stories>")
    try:
        data = request.get_json()
        # 1. Generate User Stories/Features based on the inputs
        feature_template = jinja_template_env.get_template('05_refine.jinja2')
        feature_req = feature_template.render(
            requirements=data["reqDesc"], extraContext=data["extraContext"], technologies=data['technicalDetails']
        )

        # Create LLM handler
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )

        # Prepare message and invoke LLM
        llm_message = LLMUtils.prepare_messages(prompt=feature_req)
        features = llm_handler.invoke(messages=llm_message)

        splits = [line for line in features.strip().split("\n") if line.strip()]
        # 2. Evaluation of generated user stories/features
        feature_evaluation_template = jinja_template_env.get_template('06_evaluate.jinja2')
        features_splits_json = json.dumps(splits)
        parsed_evaluation = feature_evaluation_template.render(
            requirements=data["reqDesc"], features=features_splits_json
        )

        # Prepare message and invoke LLM
        llm_message = LLMUtils.prepare_messages(prompt=parsed_evaluation)
        evaluation = llm_handler.invoke(messages=llm_message)

        # 3. After the evaluation the response is sent back to LLM, generate the final set of US/features
        final_features = feature_template.render(
            requirements=data["reqDesc"], features=features, evaluation=evaluation
        )

        # Prepare message and invoke LLM
        llm_message = LLMUtils.prepare_messages(prompt=final_features)
        final_features_res = llm_handler.invoke(messages=llm_message)

        try:
            pre_format_response = json.loads(final_features_res)
            llm_response_dict = {"features": [{"id": i["id"], i["title"]: i["description"]} for i in pre_format_response['features']]}
        except json.JSONDecodeError as exc:
            logger.error(f"Request {g.request_id}: Failed to parse LLM response: {final_features_res}")
            raise CustomAppException(
                "Invalid JSON format. Please try again.",
                status_code=500,
                payload={"features": final_features_res},
            ) from exc
        merged_data = {**data, **llm_response_dict}
        logger.info(f"Request {g.request_id}: Exited <create_stories>")
        return merged_data
    except Exception as e:
        logger.error(f"Request {g.request_id}: An unexpected error occurred in <create_stories>: {str(e)}")
        raise CustomAppException(
            "An unexpected error occurred while creating the user stories.",
            status_code=500,
        ) from e

# Generate task without yaml
@solution_api.route("/api/solutions/task", methods=["POST"])
@require_access_code()
def create_task():
    logger.info(f"Request {g.request_id}: Entered <create_task>")
    try:
        data = request.get_json()
        task_template = jinja_template_env.get_template('07_task.jinja2')
        task_req = task_template.render(
            name=data["name"], userstories=data["description"], extraContext=data["extraContext"], technologies=data['technicalDetails']
        )

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(prompt=task_req)

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        llm_response = llm_handler.invoke(messages=llm_message)
        try:
            pre_format_response = json.loads(llm_response)
            llm_response_dict = {"tasks": [{"id": i["id"], i["name"]: i["acceptance"]} for i in pre_format_response['tasks']]}
        except json.JSONDecodeError as exc:
            logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
            raise CustomAppException(
                "Invalid JSON format. Please try again.",
                status_code=500,
                payload={"llm_response": llm_response},
            ) from exc
        merged_data = {**data, **llm_response_dict}
        logger.info(f"Request {g.request_id}: Exited <create_task>")
        return merged_data
    except Exception as e:
        logger.error(f"Request {g.request_id}: An unexpected error occurred in <create_task>: {str(e)}")
        raise CustomAppException(
            "An unexpected error occurred while creating the task for user stories.",
            status_code=500,
        ) from e


@solution_api.route("/api/solutions/task/update", methods=["PUT"])
@require_access_code()
def update_task():
    logger.info(f"Request {g.request_id}: Entered <update_task>")
    data = request.get_json()
    llm_response_dict = {}
    template = render_template(p_update_task)
    reqDesc = data["reqDesc"]
    taskId = data["taskId"]
    fileContent = data["fileContent"]

    if data["contentType"] == "fileContent":
        if data["reqDesc"] and data["useGenAI"]:
            fileContent = data["fileContent"]
            reqDesc = data["reqDesc"]
        else:
            fileContent = data["fileContent"]
            reqDesc = ""
    elif data["reqDesc"] and data["useGenAI"]:
        reqDesc = data["reqDesc"]
        fileContent = ""
    else:
        reqDesc = data["reqDesc"]
        fileContent = ""

    template = template.render(
        name=data["name"],
        description=data["description"],
        taskId=taskId,
        taskName=data["taskName"],
        existingTaskDescription=data["existingTaskDesc"],
        taskDescription=reqDesc,
        fileContent=fileContent,
    )

    # Prepare message for LLM
    llm_message = LLMUtils.prepare_messages(prompt=template)

    # Invoke LLM
    llm_handler = build_llm_handler(
        provider=g.current_provider,
        model_id=g.current_model
    )
    llm_response = llm_handler.invoke(messages=llm_message)
    try:
        llm_response_dict = json.loads(llm_response)
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": llm_response},
        ) from exc
    merged_data = {**data, **llm_response_dict}
    logger.info(f"Request {g.request_id}: Exited <update_task>")
    return merged_data


@solution_api.route("/api/solutions/task/add", methods=["POST"])
@require_access_code()
def add_task():
    logger.info(f"Request {g.request_id}: Entered <add_task>")
    data = request.get_json()
    llm_response_dict = {}
    template = render_template(p_add_task)
    reqDesc = data["reqDesc"]
    taskId = data["taskId"]
    fileContent = data["fileContent"]

    if data.get("contentType") == "fileContent":
        if data["reqDesc"] and data["useGenAI"]:
            fileContent = data["fileContent"]
            reqDesc = data["reqDesc"]
        else:
            fileContent = data["fileContent"]
            reqDesc = ""
    elif data["reqDesc"] and data["useGenAI"]:
        reqDesc = data["reqDesc"]
        fileContent = ""
    else:
        reqDesc = data["reqDesc"]
        fileContent = ""

    template = template.render(
        name=data["name"],
        description=data["description"],
        taskId=taskId,
        taskName=data["taskName"],
        taskDescription=reqDesc,
        fileContent=fileContent,
    )

    # Prepare message for LLM
    llm_message = LLMUtils.prepare_messages(prompt=template)

    # Invoke LLM
    llm_handler = build_llm_handler(
        provider=g.current_provider,
        model_id=g.current_model
    )
    llm_response = llm_handler.invoke(messages=llm_message)
    try:
        llm_response_dict = json.loads(llm_response)
        logger.info(f"Request {g.request_id}: Successfully processed task creation.")
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": llm_response},
        ) from exc
    merged_data = {**data, **llm_response_dict}
    logger.info(f"Request {g.request_id}: Exited <add_task>")
    return merged_data


@solution_api.route("/api/solutions/story/update", methods=["PUT"])
@require_access_code()
def update_user_story():
    logger.info(f"Request {g.request_id}: Entered <update_user_story>")
    data = request.get_json()
    llm_response_dict = {}
    template = render_template(p_update_user_story)
    reqDesc = data["reqDesc"]
    featureId = data["featureId"]
    featureRequest = data["featureRequest"]
    fileContent = data["fileContent"]

    if data.get("contentType") == "fileContent":
        if data["featureRequest"] and data["useGenAI"]:
            fileContent = data["fileContent"]
            featureRequest = data["featureRequest"]
        else:
            fileContent = data["fileContent"]
            featureRequest = ""
    elif data["featureRequest"] and data["useGenAI"]:
        featureRequest = data["featureRequest"]
        fileContent = ""
    else:
        featureRequest = data["featureRequest"]
        fileContent = ""

    template = template.render(
        name=data["name"],
        description=data["description"],
        reqDesc=reqDesc,
        featureId=featureId,
        existingFeatureDescription=data["existingFeatureDesc"],
        newFeatureDescription=featureRequest,
        fileContent=fileContent,
    )

    # Prepare message for LLM
    llm_message = LLMUtils.prepare_messages(prompt=template)

    # Invoke LLM
    llm_handler = build_llm_handler(
        provider=g.current_provider,
        model_id=g.current_model
    )
    llm_response = llm_handler.invoke(messages=llm_message)
    try:
        llm_response_dict = json.loads(llm_response)
        logger.info(f"Request {g.request_id}: Successfully processed user story update.")
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": llm_response},
        ) from exc
    merged_data = {**data, **llm_response_dict}
    logger.info(f"Request {g.request_id}: Exited <update_user_story> successfully.")
    return merged_data


@solution_api.route("/api/solutions/story/add", methods=["POST"])
@require_access_code()
def add_user_story():
    try:
        logger.info(f"Request {g.request_id}: Entered <add_user_story>")
        data = request.get_json()
        llm_response_dict = {}
        template = jinja_template_env.get_template('11_add_user_story.jinja2')
        reqDesc = data["reqDesc"]
        featureId = data["featureId"]
        fileContent = data["fileContent"]

        if data.get("contentType") == "fileContent":
            if data["featureRequest"] and data["useGenAI"]:
                fileContent = data["fileContent"]
                featureRequest = data["featureRequest"]
            else:
                fileContent = data["fileContent"]
                featureRequest = ""
        elif data["featureRequest"] and data["useGenAI"]:
            featureRequest = data["featureRequest"]
            fileContent = ""
        else:
            featureRequest = ""
            fileContent = ""


        template = template.render(
            name=data["name"],
            description=data["description"],
            reqDesc=reqDesc,
            featureId=featureId,
            featureRequest=featureRequest,
            fileContent=fileContent,
        )

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(prompt=template)

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        llm_response = llm_handler.invoke(messages=llm_message)
        try:
            llm_response_dict = json.loads(llm_response)
            logger.info(f"Request {g.request_id}: Successfully processed user story addition.")
        except json.JSONDecodeError as exc:
            logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
            raise CustomAppException(
                "Invalid JSON format. Please try again.",
                status_code=500,
                payload={"llm_response": llm_response},
            ) from exc
        merged_data = {**data, **llm_response_dict}
        logger.info(f"Request {g.request_id}: Exited <add_user_story>")
        return merged_data
    except Exception as exception:
        logger.error("An error occurred during create Story: %s", str(exception))
        raise CustomAppException("Something went wrong! Error in Create Story Api")


@solution_api.route("/api/solutions/business_process/add", methods=["POST"])
@require_access_code()
def add_business_process():
    logger.info(f"Request {g.request_id}: Entered <add_business_process>")
    data = request.get_json()
    llm_response_dict = {}
    template = render_template(p_add_business_process)
    newReqt = data["reqt"]
    BRDS = " ".join(data["selectedBRDs"])
    PRDS = " ".join(data["selectedPRDs"])
    if data["useGenAI"]:
        template = template.render(
            name=data["name"],
            description=data["description"],
            newReqt=newReqt,
            BRDS=BRDS,
            PRDS=PRDS,
        )

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(prompt=template)

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        llm_response = llm_handler.invoke(messages=llm_message)
    else:
        llm_response = json.dumps(
            {"LLMreqt": {"title": data["title"], "requirement": newReqt}}
        )
    try:
        llm_response_dict = json.loads(llm_response)
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": llm_response},
        ) from exc

    merged_data = {**data, **llm_response_dict}
    logger.info(f"Request {g.request_id}: Exited <add_business_process>")
    return merged_data


@solution_api.route("/api/solutions/business_process/update", methods=["PUT"])
@require_access_code()
def update_business_process():
    logger.info(f"Request {g.request_id}: Entered <update_business_process>")
    data = request.get_json()
    llm_response_dict = {}  # Initialize the variable here
    template = render_template(p_update_business_process)
    updatedReqt = data["updatedReqt"]
    BRDS = " ".join(data["selectedBRDs"])
    PRDS = " ".join(data["selectedPRDs"])
    if data["useGenAI"]:
        template = template.render(
            name=data["name"],
            description=data["description"],
            existingReqt=data["reqDesc"],
            updatedReqt=updatedReqt,
            reqId=data["reqId"],
            BRDS=BRDS,
            PRDS=PRDS,
        )

        # Prepare message for LLM
        llm_message = LLMUtils.prepare_messages(prompt=template)

        # Invoke LLM
        llm_handler = build_llm_handler(
            provider=g.current_provider,
            model_id=g.current_model
        )
        llm_response = llm_handler.invoke(messages=llm_message)
    else:
        llm_response = json.dumps(
            {"updated": {"title": data["title"], "requirement": updatedReqt}}
        )
    try:
        llm_response_dict = json.loads(llm_response)
    except json.JSONDecodeError as exc:
        logger.error(f"Request {g.request_id}: Failed to parse LLM response: {llm_response}")
        raise CustomAppException(
            "Invalid JSON format. Please try again.",
            status_code=500,
            payload={"llm_response": llm_response},
        ) from exc
    merged_data = {**data, **llm_response_dict}
    logger.info(f"Request {g.request_id}: Exited <update_business_process>")
    return merged_data


@solution_api.route("/api/solutions/integration/knowledgebase/validation", methods=["POST"])
@require_access_code()
def validate_bedrock_id():
    logger.info(f"Request {g.request_id}: Entered <validate_bedrock_id>")
    data = request.get_json()

    if not data or 'bedrockId' not in data:
        logger.error(
            f"Request {g.request_id}: Missing bedrock_id in payload")
        raise CustomAppException(
            "Payload must include 'bedrock_id'",
            status_code=400
        )

    bedrock_id = data['bedrockId']

    try:
        AmazonKnowledgeBasesRetriever(
            knowledge_base_id=bedrock_id,
            retrieval_config={
                "vectorSearchConfiguration": {"numberOfResults": 1}},
        ).invoke("test connection")

        logger.info(f"Request {g.request_id}: Exited <validate_bedrock_id>")
        return json.dumps({"isValid": True}), 200
    except Exception as e:
        logger.error(f"Request {g.request_id}: Failed to validate bedrock_id: {str(e)}")
        return json.dumps({"isValid": False}), 200
