import { Injectable } from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';
import {
  JiraCredentials,
  AdoCredentials,
} from '../../model/interfaces/projects.interface';

export type IntegrationType = 'jira' | 'ado';

@Injectable({
  providedIn: 'root',
})
export class IntegrationCredentialsService {
  constructor(private electronService: ElectronService) {}

  /**
   * Generate the store key for integration credentials
   */
  private getStoreKey(projectName: string, projectId: string): string {
    return `integration-credentials-${projectName}-${projectId}`;
  }

  /**
   * Get credentials for a specific integration type
   */
  async getCredentials<T>(
    projectName: string,
    projectId: string,
    integrationType: IntegrationType,
  ): Promise<T | null> {
    try {
      const key = this.getStoreKey(projectName, projectId);
      const allCredentials = await this.electronService.getStoreValue(key);
      return (allCredentials?.[integrationType] as T) || null;
    } catch (error) {
      console.error(`Error getting ${integrationType} credentials:`, error);
      return null;
    }
  }

  /**
   * Save credentials for a specific integration type
   */
  async saveCredentials<T>(
    projectName: string,
    projectId: string,
    integrationType: IntegrationType,
    credentials: T,
  ): Promise<void> {
    try {
      const key = this.getStoreKey(projectName, projectId);
      const existingCredentials =
        (await this.electronService.getStoreValue(key)) || {};

      const updatedCredentials = {
        ...existingCredentials,
        [integrationType]: credentials,
      };

      await this.electronService.setStoreValue(key, updatedCredentials);
    } catch (error) {
      console.error(`Error saving ${integrationType} credentials:`, error);
      throw error;
    }
  }

  /**
   * Remove credentials for a specific integration type
   */
  async removeCredentials(
    projectName: string,
    projectId: string,
    integrationType: IntegrationType,
  ): Promise<void> {
    try {
      const key = this.getStoreKey(projectName, projectId);
      const existingCredentials =
        (await this.electronService.getStoreValue(key)) || {};

      if (existingCredentials[integrationType]) {
        delete existingCredentials[integrationType];

        const hasOtherCredentials = Object.keys(existingCredentials).length > 0;
        if (hasOtherCredentials) {
          await this.electronService.setStoreValue(key, existingCredentials);
        } else {
          await this.electronService.removeStoreValue(key);
        }
      }
    } catch (error) {
      console.error(`Error removing ${integrationType} credentials:`, error);
      throw error;
    }
  }

  /**
   * Check if project metadata contains legacy credentials that need migration
   */
  shouldMigrateCredentials(appInfo: any): boolean {
    const hasJiraCredentials = !!(
      appInfo?.integration?.jira?.clientId ||
      appInfo?.integration?.jira?.clientSecret ||
      appInfo?.integration?.jira?.jiraProjectKey ||
      appInfo?.integration?.jira?.redirectUrl
    );

    const hasAdoCredentials = !!(
      appInfo?.integration?.ado?.personalAccessToken ||
      appInfo?.integration?.ado?.organization ||
      appInfo?.integration?.ado?.projectName
    );

    return hasJiraCredentials || hasAdoCredentials;
  }

  /**
   * Migrate credentials from metadata to Electron store
   */
  async migrateCredentialsFromMetadata(
    projectName: string,
    projectId: string,
    appInfo: any,
  ): Promise<{ success: boolean; migratedTypes: string[] }> {
    const migratedTypes: string[] = [];

    try {
      if (appInfo?.integration?.jira) {
        const jiraConfig = appInfo.integration.jira;
        if (
          jiraConfig.clientId ||
          jiraConfig.clientSecret ||
          jiraConfig.jiraProjectKey ||
          jiraConfig.redirectUrl
        ) {
          const jiraCredentials: JiraCredentials = {
            clientId: jiraConfig.clientId || '',
            clientSecret: jiraConfig.clientSecret || '',
            jiraProjectKey: jiraConfig.jiraProjectKey || '',
            redirectUrl: jiraConfig.redirectUrl || '',
            baseUrl: jiraConfig.baseUrl || '',
          };

          await this.saveCredentials(
            projectName,
            projectId,
            'jira',
            jiraCredentials,
          );
          migratedTypes.push('JIRA');
        }
      }

      if (appInfo?.integration?.ado) {
        const adoConfig = appInfo.integration.ado;
        if (
          adoConfig.personalAccessToken ||
          adoConfig.organization ||
          adoConfig.projectName
        ) {
          const adoCredentials: AdoCredentials = {
            personalAccessToken: adoConfig.personalAccessToken || '',
            organization: adoConfig.organization || '',
            projectName: adoConfig.projectName || '',
          };

          await this.saveCredentials(
            projectName,
            projectId,
            'ado',
            adoCredentials,
          );
          migratedTypes.push('ADO');
        }
      }

      return { success: true, migratedTypes };
    } catch (error) {
      console.error('Error migrating credentials:', error);
      return { success: false, migratedTypes: [] };
    }
  }

  /**
   * Clean sensitive credentials from metadata after successful migration
   */
  cleanMetadataCredentials(appInfo: any): any {
    const cleanedAppInfo = { ...appInfo };

    // Clean JIRA credentials but keep workItemTypeMapping
    if (cleanedAppInfo?.integration?.jira) {
      const {
        clientId,
        clientSecret,
        jiraProjectKey,
        redirectUrl,
        ...jiraRest
      } = cleanedAppInfo.integration.jira;
      cleanedAppInfo.integration.jira = jiraRest;

      // Remove empty jira object if no properties left
      if (Object.keys(cleanedAppInfo.integration.jira).length === 0) {
        delete cleanedAppInfo.integration.jira;
      }
    }

    // Clean ADO credentials but keep workItemTypeMapping
    if (cleanedAppInfo?.integration?.ado) {
      const { personalAccessToken, organization, projectName, ...adoRest } =
        cleanedAppInfo.integration.ado;
      cleanedAppInfo.integration.ado = adoRest;

      // Remove empty ado object if no properties left
      if (Object.keys(cleanedAppInfo.integration.ado).length === 0) {
        delete cleanedAppInfo.integration.ado;
      }
    }

    return cleanedAppInfo;
  }
}
