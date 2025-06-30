import { ipcMain } from "electron";
import axios from "axios";

export function setupAdoHandlers() {
  interface AdoValidationParams {
    organization: string;
    projectName: string;
    personalAccessToken: string;
  }

  interface AdoValidationResult {
    isValid: boolean;
  }

  async function validateAdoCredentials(
    params: AdoValidationParams
  ): Promise<AdoValidationResult> {
    const { organization, projectName, personalAccessToken } = params;

    try {
      const auth = Buffer.from(`:${personalAccessToken}`).toString("base64");

      const apiUrl = `https://dev.azure.com/${organization}/_apis/projects/${projectName}`;

      await axios.get(apiUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      return {
        isValid: true,
      };
    } catch {
      return {
        isValid: false,
      };
    }
  }

  ipcMain.handle(
    "validate-ado-credentials",
    async (_event, params: AdoValidationParams) => {
      return await validateAdoCredentials(params);
    }
  );
}
