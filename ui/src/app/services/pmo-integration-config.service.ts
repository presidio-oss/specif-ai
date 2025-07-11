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
}
