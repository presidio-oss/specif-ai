import {
  REQUIREMENT_DISPLAY_NAME_PLURAL_MAP,
  REQUIREMENT_TYPE,
} from "../../../constants/requirement.constants";
import { toolUseContext } from "./tool-use.context";

interface RequirementPreference {
  isEnabled: boolean;
  maxCount: number;
}

interface GatherInfoParams {
  app: {
    name: string;
    description: string;
    technicalDetails?: string;
  };
  recursionLimit: number;
  requirementPreferences: {
    [key in keyof typeof REQUIREMENT_TYPE]?: RequirementPreference;
  };
}

export function createResearchInformationPrompt({
  app,
  recursionLimit,
  requirementPreferences,
}: GatherInfoParams): string {
  const enabledTypes = getEnabledRequirementTypes(requirementPreferences);
  const formattedTypes = formatRequirementTypes(enabledTypes);
  const perspectives = getRequirementPerspectives(enabledTypes);

  return `
  You are a lead technical analyst. As part of your role you gather comprehensive and relevant information to support the downstream generation of ${formattedTypes}.

  ## App Context:
    App Name: ${app.name}
    Description: ${app.description}
    Technical Details: ${app.technicalDetails}
  
  ## Objective
    Your role is to intelligently conduct thorough research and gather all necessary information that will enable the high-quality generation of ${formattedTypes}.
    You have access to various tools for information retrieval like searching, retrieving information from knowledge bases, and accessing relevant documentation. Your interactions, the tools you use, and your findings will be preserved in context for the downstream requirement generation agents.

  ## Process
    1. Comprehensive Research and Information Gathering:
      - Your primary focus is to conduct thorough research using available tools to gather a wide range of information relevant to the ${
        app.name
      } app and its requirements.
        You will continue this phase until you have a comprehensive understanding of the application from user, technical, business, and other relevant perspectives.

    2. Synthesis:
      Provide a comprehensive summary of your research findings, organized by the following aspects:
      ${perspectives.join("\n      ")}
      - Technical Perspective: Important technical constraints, possibilities, and considerations relevant to the app's development and architecture.

      For each aspect, provide specific insights that will be directly relevant to the downstream agents generating the ${formattedTypes}.

      Finally, explicitly mention any potential gaps in your understanding or areas of uncertainty that the requirement generation agents should be aware of.

  ## Tool User guidelines
    ${toolUseContext({ recursionLimit })}
    - Once you have explored reasonable avenues and subsequent tool calls are not yielding significant new or valuable information, you should conclude your research phase.

  ## Strict Guidelines:
    - You MUST not ask questions directly to the user, as there is currently no interface for providing responses.
    - You MUST only perform read only or retrieval actions. You must not write to any external data storage like file system, database or any other source.
      If you don't do this you will not be asked to do this research again.

  Your goal is to create a rich and relevant context that will enable the downstream agents to create high-quality and comprehensive requirements for the ${
    app.name
  } app.

  Ensure your research is thorough and well-documented in your interactions, and remember to use your tool calls strategically and efficiently, diversifying your sources and adapting your approach when facing errors.
  I repeat again, your sole function is to retrieve information using the provided tools. You MUST NOT use any tool to write to, modify, or create any external context or resources.`;
}

// utils

const getEnabledRequirementTypes = (
  preferences: GatherInfoParams["requirementPreferences"]
) => {
  return Object.entries(preferences)
    .filter(([_, pref]) => pref?.isEnabled)
    .map(([type]) => type as keyof typeof REQUIREMENT_TYPE);
};

const getPluralNameForType = (type: keyof typeof REQUIREMENT_TYPE) => {
  return REQUIREMENT_DISPLAY_NAME_PLURAL_MAP[type];
};

const formatRequirementTypes = (
  types: Array<keyof typeof REQUIREMENT_TYPE>
): string => {
  if (types.length === 0) return "";
  if (types.length === 1) return getPluralNameForType(types[0]);

  const lastType = types[types.length - 1];
  const otherTypes = types.slice(0, -1);

  return `${otherTypes
    .map((type) => getPluralNameForType(type))
    .join(", ")}, and ${getPluralNameForType(lastType)}`;
};

const getRequirementPerspectives = (
  types: Array<keyof typeof REQUIREMENT_TYPE>
): string[] => {
  const perspectives: Record<string, string> = {
    [REQUIREMENT_TYPE.PRD]:
      "- User Perspective: Key insights about target users, their needs, pain points, and expectations.",
    [REQUIREMENT_TYPE.BRD]:
      "- Business Perspective: Key business goals, objectives, stakeholders, and any relevant market or competitive information.",
    [REQUIREMENT_TYPE.UIR]:
      "- UI/UX Perspective: Insights related to user interface design, usability, and user experience considerations.",
    [REQUIREMENT_TYPE.NFR]:
      "- Non-Functional Perspective: Important considerations for performance, security, scalability, reliability, and other quality attributes.",
  };

  return types
    .map((type) => perspectives[type])
    .filter((perspective): perspective is string => perspective !== undefined);
};
