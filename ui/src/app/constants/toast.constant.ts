export const JIRA_TOAST = {
  SUCCESS: 'JIRA Sync Successful',
  ERROR: 'JIRA Sync Failed',
  INFO: 'JIRA Sync Initiated',
};

export const APP_INTEGRATIONS = {
  JIRA: {
    SUCCESS: 'Successfully Authenticated with JIRA',
    DISCONNECT: 'Successfully Disconnected from JIRA',
    ERROR: 'Failed to Authenticate with JIRA',
  },
  ADO: {
    SUCCESS: 'Azure DevOps connected successfully',
    DISCONNECT: 'Azure DevOps disconnected successfully',
    ERROR: 'Failed to connect to Azure DevOps',
    VALIDATION_ERROR:
      'Invalid Azure DevOps credentials, please check and try again',
  },
  BEDROCK: {
    SUCCESS: 'AWS Bedrock Knowledge Base Config Updated',
    DISCONNECT: 'Successfully Disconnected from AWS Bedrock Knowledge Base',
    INVALID: 'Invalid AWS Knowledge Base Id please check the id and try again',
    ERROR: 'Failed to Update AWS Bedrock Knowledge Base Config',
  },
};

export const DEFAULT_TOAST_DURATION = 5000;
