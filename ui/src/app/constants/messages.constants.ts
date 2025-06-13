export const APP_INFO_COMPONENT_SUCCESS_MESSAGES = {
  BRD_UPDATED_SUCCESSFULLY: 'The business requirement has been updated.',
  PRD_UPDATED_SUCCESSFULLY:
    'The product requirement has been updated. Please regenerate the user stories as needed.',
  NFR_UPDATED_SUCCESSFULLY: 'The non-functional requirement has been updated.',
  UIR_UPDATED_SUCCESSFULLY: 'The user-interface requirement has been updated.',
  BP_UPDATED_SUCCESSFULLY: 'The business process has been updated.',
};

export const APP_INFO_COMPONENT_ERROR_MESSAGES = {
  BRD_UPDATE_ERROR: 'Error in updating the business requirement.',
  PRD_UPDATE_ERROR: 'Error in updating the product requirement.',
  NFR_UPDATE_ERROR: 'Error in updating the non-functional requirement.',
  UIR_UPDATE_ERROR: 'Error in updating the user-interface requirement.',
  BP_UPDATE_ERROR: 'Error in updating the business process.',
  REQUIRES_PRD_OR_BRD: 'Please add at least one active PRD or BRD before creating a Business Process',
};

export const FEATURE_BREAKDOWN_COMPONENT_SUCCESS_MESSAGES = {
  ADDED_USER_STORY_SUCCESSFULLY:
    'New user story added! Please refine it into tasks as needed.',
  UPDATED_USER_STORY_SUCCESSFULLY:
    'User story updated! Please refine it into tasks as needed.',
  ADDED_TASK_SUCCESSFULLY:
    'New task added! Consider using the AI feature for implementation.',
  UPDATED_TASK_SUCCESSFULLY:
    'Task updated! Consider using the AI feature for implementation.',
};

export const FEATURE_BREAKDOWN_COMPONENT_ERROR_MESSAGES = {
  ADD_USER_STORY_ERROR: 'Error in adding user story.',
  UPDATE_USER_STORY_ERROR: 'Error in updating user story.',
  ADD_TASK_ERROR: 'Error in adding task.',
  UPDATE_TASK_ERROR: 'Error in updating task.',
};

export const LOGIN_ERROR_MESSAGES = {
  ON_INCORRECT_PASSCODE: 'Incorrect passcode. Please enter correct Access Code',
  ON_GENERIC_ERROR: 'An error occurred. Please try again later.',
  ON_EMPTY_PASSCODE: 'Please enter a passcode',
};

export const FORM_ERROR_MESSAGES: { [key in string]: string } = {
  required: 'This is a required field',
};

export const PROJECT_ERROR_MESSAGES = {
  PROJECT_CREATION_ABORTED: 'Solution requirements generation was cancelled',
};
