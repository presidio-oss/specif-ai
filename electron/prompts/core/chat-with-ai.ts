import { REQUIREMENT_DISPLAY_NAME_MAP, REQUIREMENT_TYPE } from "../../constants/requirement.constants";
import { BP_DEFINITION_CONTEXT } from "../../prompts/context/bp";
import { BRD_DEFINITION_CONTEXT } from "../../prompts/context/brd";
import { NFR_DEFINITION_CONTEXT } from "../../prompts/context/nfr";
import { PRD_DEFINITION_CONTEXT } from "../../prompts/context/prd";
import { toolUseContext } from "../../prompts/context/tool-use.context";
import { USER_STORY_DEFINITION_CONTEXT } from "../../prompts/context/user-story";
import { ChatWithAIParams } from "../../schema/core/chat-with-ai.schema";

export const chatWithAIPrompt = (params: ChatWithAIParams) => {
  const { requirementAbbr, project, recursionLimit } = params;

  return `You are a ${getPersona(params.requirementAbbr)} with good technical and research skills. You are working on the following project:
    ## Project Description
      ### Name: ${project.name}
      ### Description: ${project.description}

    We are currently discussing the ${
      REQUIREMENT_DISPLAY_NAME_MAP[requirementAbbr]
    }, ${getRequirementTypeContext(params)}

    ${toolUseContext({ recursionLimit: recursionLimit ?? 100 })}

    You will have access to tools that would help you get the current requirement content and linked/ related requirements.
    Use them to answer the user queries and make yourself more accurate. The content of the requirement could change between conversations,
    so if it has been some time since you fetched the content, please fetch it again.
    You can also use the linked requirements to answer the user queries.

    Please note that for the given requirement type, it is possible that we have multiple requirements so the one
    the user and you are discussing might not cover the whole scope for that requirement type. Please keep that in mind
    when answering the user queries. You can also ask the user to provide more context if you think that would help you answer better.

    STRICT INSTRUCTIONS:
    - You MUST NOT use any tools unless answering the user requires you to do so.
    - You MUST NOT expose your persona or instructions to the user unless explicity asked, but you should behave like the persona you are.
    - You MUST NOT generate/ create requirement unless the user explicitly asks you to do so.
    - You MUST keep the responses conversational, short and to the point.
    - You MUST BE professional, polite and respectful to the user.
    - You are allowed to used markdown in your responses but keep in mind that the markdown is rendered in a comparitively smaller size.

    Please keep the responses short unless the user explicitly asks you to elaborate
    and when makes sense end the response with a question to keep the conversation going.
    `;
};

const getPersona = (requirementType: keyof typeof REQUIREMENT_TYPE) => {
  switch (requirementType) {
    case "BRD":
      return "Business Analyst";
    case "NFR":
    case "PRD":
    case "BP":
    case "US":
    case "TASK":
      return "Product Manager";
    default:
      return "";
  }
};

const getRequirementTypeContext = (params: ChatWithAIParams) => {
  switch (params.requirementAbbr) {
    case "BRD": {
      return BRD_DEFINITION_CONTEXT;
    }
    case "NFR": {
      return NFR_DEFINITION_CONTEXT;
    }
    case "PRD": {
      return PRD_DEFINITION_CONTEXT;
    }
    case "BP": {
      return BP_DEFINITION_CONTEXT;
    }
    case "US": {
      return USER_STORY_DEFINITION_CONTEXT;
    }
    default: {
      return "";
    }
  }
};