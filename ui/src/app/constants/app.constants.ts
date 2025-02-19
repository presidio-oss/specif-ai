import { environment } from '../../environments/environment';

export const APP_CONSTANTS = {
  WORKING_DIR: 'WORKING_DIR',
  VERSION: 'APP_VERSION',
  APP_URL: 'APP_URL',
  APP_PASSCODE_KEY: 'APP_PASSCODE_KEY',
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

export enum ENTITY_DISPLAY_NAME_MAP {
  STORIES = 'User Story',
  BP = 'Business Process',
  BRD = 'Business Requirement',
  NFR = 'Non Functional Requirement',
  PRD = 'Product Requirement',
  UIR = 'User Interface Requirement',
  TASK = 'Task',
}

const getEntityDisplayName = (folderId: string): string => {
  return (
    ENTITY_DISPLAY_NAME_MAP[folderId as keyof typeof ENTITY_DISPLAY_NAME_MAP] ||
    'Unknown Requirement'
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
  },
};

export const APP_MESSAGES = {
  AWS_BEDROCK_TOOLTIP_MESSAGE: `Enabling the AWS Bedrock Knowledge Base enriches ${environment.ThemeConfiguration.appName}  with enterprise-specific context, enhancing its ability to generate precise, business-relevant responses. This added context improves accuracy and ensures deeper alignment with the overall solution.`,
  JIRA_ACCORDION:
    'JIRA Integration allows users to publish generated user stories as Jira issues by configuring their Jira account and authenticating with Jira. Following configuration of details users can authenticate with Jira to establish a secure sync. Once synchronized, users can select the\n' +
    'Sync with Jira\n' +
    'option to create tickets directly in JIRA with the configured Project Key.',
  AWS_BEDROCK_ACCORDION_MESSAGE: `Using the AWS Bedrock Knowledge Base enriches ${environment.ThemeConfiguration.appName} with enterprise-specific context, enhancing its ability to generate precise, business-relevant responses. This added context improves accuracy and ensures deeper alignment with the overall solution.`,
};

export const TOOLTIP_CONTENT = {
  IMPORT_FROM_CODE_BUTTON: "Import from Code",
}

export const PRD_HEADINGS = {
  SCREENS: 'Screens: ',
  PERSONAS: 'Personas: ',
  SCREENS_FORMATTED: '\n\nScreens:\n',
  PERSONAS_FORMATTED: '\n\nPersonas:\n',
}
