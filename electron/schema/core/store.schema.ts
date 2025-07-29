export interface AppConfig {
  username?: string;
  directoryPath?: string;
}

export interface JiraCredentials {
  clientId: string;
  clientSecret: string;
  jiraProjectKey: string;
  redirectUrl: string;
}

export interface AdoCredentials {
  personalAccessToken: string;
  organization: string;
  projectName: string;
}

export interface IntegrationCredentials {
  jira?: JiraCredentials;
  ado?: AdoCredentials;
}
