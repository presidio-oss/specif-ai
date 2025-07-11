export interface AdoTokenInfo {
  organization: string | null;
  project: string | null;
  personalAcessToken: string | null;
  adoUrl: string | null;
}

export function getAdoTokenInfo(projectId: string): AdoTokenInfo {
  const organization = sessionStorage.getItem(`${projectId}-adoOrganization`);
  const project = sessionStorage.getItem(`${projectId}-project`);
  const personalAcessToken = sessionStorage.getItem(`${projectId}-personalAcessToken`);
  const adoUrl = sessionStorage.getItem(`${projectId}-adoUrl`);

  return {
    organization,
    project,
    personalAcessToken,
    adoUrl,
  };
}

export function storeAdoToken(
  organization: string,
  project: string,
  projectId: string,
  personalAcessToken: string
): void {
  sessionStorage.setItem(`${projectId}-organization`, organization);
  sessionStorage.setItem(`${projectId}-project`, project);
  sessionStorage.setItem(`${projectId}-personalAcessToken`, personalAcessToken);
  sessionStorage.setItem(`${projectId}-adoUrl`,`https://dev.azure.com/${organization}`);
}

export function resetAdoToken(projectId: string): void {
  sessionStorage.removeItem(`${projectId}-organization`);
  sessionStorage.removeItem(`${projectId}-project`);
  sessionStorage.removeItem(`${projectId}-personalAcessToken`);
  sessionStorage.removeItem(`${projectId}-adoUrl`);
}

export const DEFAULT_ADO_PORT = 49154;
