import { environment } from '../../environments/environment';

export const APP_CONSTANTS = {
  WORKING_DIR: 'WORKING_DIR',
  VERSION: 'APP_VERSION',
  APP_URL: 'APP_URL',
  USER_NAME: 'USER_NAME',
  APP_PASSCODE_KEY: 'APP_PASSCODE_KEY',
  USER_ID: 'USER_ID',
};
export const FILTER_STRINGS = { BASE: 'base', FEATURE: 'feature', ARCHIVED: 'archived' };
export const CHAT_TYPES = {
  REQUIREMENT: 'requirement',
  USERSTORY: 'userstory',
  TASK: 'task',
};

export const BP_FILE_KEYS = {
  BRD_KEY: 'selectedBRDs',
  PRD_KEY: 'selectedPRDs',
};

export const ERROR_MESSAGES = {
  PASSWORD_ERROR: 'Passcode does not match. Please try again.',
  GENERATE_SUGGESTIONS_FAILED: 'Failed to generate suggestions',
  DELETE_ASSOCIATED_ERROR: (reqId: string, bpIds: string[]) =>
    `Unable to remove ${reqId} because it's linked to the following business processes: ${bpIds.join(', ')}.`,
};

export const SOLUTION_CREATION_TOGGLE_MESSAGES = {
  BROWNFIELD_SOLUTION:
    'Enabling this toggle will not generate any business or solution requirements for the given solution.',
  GREENFIELD_SOLUTION:
    'You can create requirements based on the solution context!',
};

export const CONFIRMATION_DIALOG = {
  DELETION: {
    TITLE: 'Confirm Deletion',
    DESCRIPTION: (entityName: string) =>
      `Are you sure you want to delete <span class="font-semibold">${entityName}</span>?`,
    CANCEL_BUTTON_TEXT: 'Cancel',
    PROCEED_BUTTON_TEXT: 'Delete',
  },
  UNSAVED_CHANGES: {
    TITLE: 'Confirm',
    DESCRIPTION:
      'You have unsaved changes on this page. Are you sure you want to navigate to another page without saving?',
    PROCEED_BUTTON_TEXT: 'Stay',
    CANCEL_BUTTON_TEXT: 'Leave',
  },
  LOGOUT: {
    TITLE: 'Confirm Logout',
    DESCRIPTION: 'Are you sure you want to log out?',
    CANCEL_BUTTON_TEXT: 'Cancel',
    PROCEED_BUTTON_TEXT: 'Log Out',
  },
  JIRA_REAUTHENTICATION: {
    TITLE: 'Reauthenticate with Jira',
    DESCRIPTION:
      'Your session with Jira has expired. Please reauthenticate to continue.',
    CANCEL_BUTTON_TEXT: 'Cancel',
    PROCEED_BUTTON_TEXT: 'Reauthenticate',
  },
  JIRA_DETAILS_MISSING: {
    TITLE: 'Jira Integration Incomplete',
    DESCRIPTION:
      'It looks like your Jira details are missing. Please return to the integration settings, fill in your details, and save them to continue.',
    CANCEL_BUTTON_TEXT: 'Cancel',
    PROCEED_BUTTON_TEXT: 'Open integration settings',
  },
};

export const REQUIREMENT_TYPE = {
  BRD: 'BRD',
  PRD: 'PRD',
  UIR: 'UIR',
  NFR: 'NFR',
  BP: 'BP',
  US: 'US',
  TASK: 'TASK',
} as const;

export const REQUIREMENT_DISPLAY_NAME_MAP = {
  [REQUIREMENT_TYPE.US]: 'User Story',
  [REQUIREMENT_TYPE.BP]: 'Business Process',
  [REQUIREMENT_TYPE.BRD]: 'Business Requirement',
  [REQUIREMENT_TYPE.NFR]: 'Non Functional Requirement',
  [REQUIREMENT_TYPE.PRD]: 'Product Requirement',
  [REQUIREMENT_TYPE.UIR]: 'User Interface Requirement',
  [REQUIREMENT_TYPE.TASK]: 'Task',
};

const getEntityDisplayName = (folderId: string): string => {
  return (
    REQUIREMENT_DISPLAY_NAME_MAP[
      folderId as keyof typeof REQUIREMENT_DISPLAY_NAME_MAP
    ] || 'Unknown Requirement'
  );
};

const TOASTER_MESSAGES_DEFAULT_TEMPLATE = {
  SUCCESS: (entityKey: string, action: string, entityId?: string) => {
    return entityId
      ? `${getEntityDisplayName(entityKey)} - <span class="font-semibold">${entityId}</span> ${action} successfully!`
      : `${getEntityDisplayName(entityKey)} ${action} successfully!`;
  },
  FAILURE: (entityKey: string, action: string, entityId?: string) => {
    return entityId
      ? `Failed to ${action} ${getEntityDisplayName(entityKey)} - <span class="highlight">${entityId}</span>. Please try again.`
      : `Failed to ${action} ${getEntityDisplayName(entityKey)}. Please try again.`;
  },
};

export const TOASTER_MESSAGES = {
  ENTITY: {
    ADD: {
      SUCCESS: (entityType: string) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.SUCCESS(entityType, 'added'),
      FAILURE: (entityType: string) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.FAILURE(entityType, 'add'),
    },
    UPDATE: {
      SUCCESS: (entityType: string, entityId: string) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.SUCCESS(
          entityType,
          'updated',
          entityId,
        ),
      FAILURE: (entityType: string, entityId: string) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.FAILURE(
          entityType,
          'update',
          entityId,
        ),
    },
    DELETE: {
      SUCCESS: (entityType: string, entityId: string) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.SUCCESS(
          entityType,
          'deleted',
          entityId,
        ),
      FAILURE: (entityType: string, entityId: string) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.FAILURE(
          entityType,
          'delete',
          entityId,
        ),
    },
    COPY: {
      SUCCESS: (entityType: string, entityId: string) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.SUCCESS(
          entityType,
          'copied',
          entityId,
        ),
      FAILURE: (entityType: string, entityId: string) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.FAILURE(entityType, 'copy', entityId),
    },
    GENERATE: {
      SUCCESS: (entityType: string, isRegenerate = false) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.SUCCESS(
          entityType,
          isRegenerate ? 'regenerated' : 'generated',
        ),
      FAILURE: (entityType: string, isRegenerate = false) =>
        TOASTER_MESSAGES_DEFAULT_TEMPLATE.FAILURE(
          entityType,
          isRegenerate ? 'regenerate' : 'generate',
        ),
    },
  },
};

export const APP_MESSAGES = {
  AWS_BEDROCK_TOOLTIP_MESSAGE: `Enabling the AWS Bedrock Knowledge Base enriches ${environment.ThemeConfiguration.appName}  with enterprise-specific context, enhancing its ability to generate precise, business-relevant responses. This added context improves accuracy and ensures deeper alignment with the overall solution.`,
  JIRA_ACCORDION:
    'JIRA Integration allows users to publish generated user stories as Jira issues by configuring their Jira account and authenticating with Jira. Following configuration of details users can authenticate with Jira to establish a secure sync. Once synchronized, users can select the\n' +
    'Sync with Jira\n' +
    'option to create tickets directly in JIRA with the configured Project Key.',
  AWS_BEDROCK_ACCORDION_MESSAGE: `Using the AWS Bedrock Knowledge Base enriches ${environment.ThemeConfiguration.appName} with enterprise-specific context, enhancing its ability to generate precise, business-relevant responses. This added context improves accuracy and ensures deeper alignment with the overall solution.`,
  JIRA_PREREQUISITE: `Please ensure that you have the following issue types in your JIRA project:
  <ul class="list-disc pl-5 mt-2">
    <li>Epic</li>
    <li>Story</li>
    <li>Task</li>
  </ul>`,
};

export const TOOLTIP_CONTENT = {
  IMPORT_FROM_CODE_BUTTON: 'Import from Code',
};

export const FOLDER = {
  BRD: 'BRD',
  PRD: 'PRD',
  NFR: 'NFR',
  UIR: 'UIR',
  BP: 'BP',
};

export const REQUIREMENT_TYPE_FOLDER_MAP = {
  [REQUIREMENT_TYPE.BRD]: FOLDER.BRD,
  [REQUIREMENT_TYPE.PRD]: FOLDER.PRD,
  [REQUIREMENT_TYPE.NFR]: FOLDER.NFR,
  [REQUIREMENT_TYPE.UIR]: FOLDER.UIR,
  [REQUIREMENT_TYPE.BP]: FOLDER.BP,
} as const;

export const FOLDER_REQUIREMENT_TYPE_MAP = {
  [FOLDER.BRD]: REQUIREMENT_TYPE.BRD,
  [FOLDER.PRD]: REQUIREMENT_TYPE.PRD,
  [FOLDER.NFR]: REQUIREMENT_TYPE.NFR,
  [FOLDER.UIR]: REQUIREMENT_TYPE.UIR,
  [FOLDER.BP]: REQUIREMENT_TYPE.BP,
} as const;


// types

export type RequirementType =
  (typeof REQUIREMENT_TYPE)[keyof typeof REQUIREMENT_TYPE];

export type RootRequirementType = Exclude<
  RequirementType,
  | typeof REQUIREMENT_TYPE.BP
  | typeof REQUIREMENT_TYPE.TASK
  | typeof REQUIREMENT_TYPE.US
>;
