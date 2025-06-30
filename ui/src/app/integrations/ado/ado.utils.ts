export interface AdoTokenInfo {
  token: string | null;
  adoURL: string | null;
  projectName: string | null;
  organization: string | null;
}

// For now, using hardcoded values as requested
export function getAdoTokenInfo(projectId: string): AdoTokenInfo {
  // Hardcoded PAT and other values - to be replaced with actual implementation later
  const token = "";
  const adoURL = "";
  const organization = "";
  const projectName = "";

  return {
    token,
    adoURL,
    organization,
    projectName
  };
}

// This will be implemented properly later
export function storeAdoToken(
  token: string,
  projectName: string,
  organization: string,
  projectId: string
): void {
  console.log("ADO token storage to be implemented");
  // Placeholder for future implementation
}

export function resetAdoToken(projectId: string): void {
  console.log("ADO token reset to be implemented");
  // Placeholder for future implementation
}
