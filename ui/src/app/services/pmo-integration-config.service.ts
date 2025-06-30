import { Injectable } from '@angular/core';
import { PmoIntegrationConfig } from '../types/pmo-integration.types';
import { JiraIntegrationComponent } from '../components/pmo-integration/jira-integration/jira-integration.component';
import { AdoIntegrationComponent } from '../components/pmo-integration/ado-integration/ado-integration.component';

@Injectable({
  providedIn: 'root',
})
export class PmoIntegrationConfigService {
  private integrationConfigs: PmoIntegrationConfig[] = [
    {
      id: 'jira',
      name: 'jira',
      displayName: 'Jira',
      logoPath: './assets/img/logo/mark_gradient_blue_jira.svg',
      component: JiraIntegrationComponent,
      isEnabled: true,
      order: 1,
    },
    {
      id: 'ado',
      name: 'ado',
      displayName: 'Azure DevOps',
      logoPath: './assets/img/logo/azure_devops_logo.svg',
      component: AdoIntegrationComponent,
      isEnabled: true,
      order: 2,
    },
  ];

  getEnabledIntegrations(): PmoIntegrationConfig[] {
    return this.integrationConfigs
      .filter((config) => config.isEnabled)
      .sort((a, b) => a.order - b.order);
  }

  getIntegrationById(id: string): PmoIntegrationConfig | undefined {
    return this.integrationConfigs.find((config) => config.id === id);
  }

  addIntegration(config: PmoIntegrationConfig): void {
    if (this.integrationConfigs.some((existing) => existing.id === config.id)) {
      throw new Error(`Integration with ID '${config.id}' already exists`);
    }
    this.integrationConfigs.push(config);
  }

  updateIntegration(id: string, updates: Partial<PmoIntegrationConfig>): void {
    const index = this.integrationConfigs.findIndex(
      (config) => config.id === id,
    );
    if (index !== -1) {
      this.integrationConfigs[index] = {
        ...this.integrationConfigs[index],
        ...updates,
      };
    }
  }

  disableIntegration(id: string): void {
    this.updateIntegration(id, { isEnabled: false });
  }

  enableIntegration(id: string): void {
    this.updateIntegration(id, { isEnabled: true });
  }
}
