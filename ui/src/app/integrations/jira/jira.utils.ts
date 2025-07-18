export interface JiraTokenInfo {
  token: string | null;
  tokenExpiration: string | null;
  jiraURL: string | null;
  refreshToken: string | null;
  projectKey: string | null;
}

export function getJiraTokenInfo(projectId: string): JiraTokenInfo {
  const token = sessionStorage.getItem(`${projectId}-jiraToken`);
  const tokenExpiration = sessionStorage.getItem(
    `${projectId}-jiraTokenExpiration`,
  );
  const jiraURL = sessionStorage.getItem(`${projectId}-jiraUrl`);
  const refreshToken = sessionStorage.getItem(`${projectId}-jiraRefreshToken`);
  const projectKey = sessionStorage.getItem(`${projectId}-projectKey`);

  return {
    token,
    tokenExpiration,
    jiraURL,
    refreshToken,
    projectKey,
  };
}

export function storeJiraToken(
  authResponse: any,
  projectKey: string,
  projectId: string,
): void {
  sessionStorage.setItem(`${projectId}-jiraToken`, authResponse.accessToken);
  sessionStorage.setItem(
    `${projectId}-jiraTokenExpiration`,
    authResponse.expirationDate,
  );
  sessionStorage.setItem(
    `${projectId}-jiraRefreshToken`,
    authResponse.refreshToken,
  );
  sessionStorage.setItem(`${projectId}-jiraTokenType`, authResponse.tokenType);
  sessionStorage.setItem(
    `${projectId}-jiraUrl`,
    `https://api.atlassian.com/ex/jira/${authResponse.cloudId}`,
  );
  sessionStorage.setItem(`${projectId}-projectKey`, projectKey);
}

export function resetJiraToken(projectId: string): void {
  sessionStorage.removeItem(`${projectId}-jiraToken`);
  sessionStorage.removeItem(`${projectId}-jiraTokenExpiration`);
  sessionStorage.removeItem(`${projectId}-jiraRefreshToken`);
  sessionStorage.removeItem(`${projectId}-jiraTokenType`);
  sessionStorage.removeItem(`${projectId}-jiraUrl`);
  sessionStorage.removeItem(`${projectId}-projectKey`);
}

export const DEFAULT_JIRA_PORT = 49152;