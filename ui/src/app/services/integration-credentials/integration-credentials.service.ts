import { Injectable } from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';

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
}
