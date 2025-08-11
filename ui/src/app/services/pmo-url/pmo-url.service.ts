import { inject, Injectable } from '@angular/core';
import { IntegrationCredentialsService } from '../integration-credentials/integration-credentials.service';
import { ElectronService } from '../../electron-bridge/electron.service';
import {
  IProjectMetadata,
  AdoCredentials,
  JiraCredentials,
} from '../../model/interfaces/projects.interface';
import { NGXLogger } from 'ngx-logger';

const PMO_TYPES = {
  JIRA: 'jira',
  ADO: 'ado',
} as const;

type PmoType = (typeof PMO_TYPES)[keyof typeof PMO_TYPES];

interface UrlGenerator {
  validateCredentials(credentials: any): boolean;
  buildUrl(credentials: any, itemId: string): string;
}

@Injectable({
  providedIn: 'root',
})
export class PmoUrlService {
  private readonly urlGenerators: Record<PmoType, UrlGenerator> = {
    [PMO_TYPES.JIRA]: {
      validateCredentials: (credentials: JiraCredentials) =>
        Boolean(credentials?.baseUrl?.trim()),
      buildUrl: (credentials: JiraCredentials, ticketKey: string) =>
        `${credentials.baseUrl.replace(/\/$/, '')}/browse/${encodeURIComponent(ticketKey)}`,
    },
    [PMO_TYPES.ADO]: {
      validateCredentials: (credentials: AdoCredentials) =>
        Boolean(
          credentials?.organization?.trim() && credentials?.projectName?.trim(),
        ),
      buildUrl: (credentials: AdoCredentials, workItemId: string) =>
        `https://dev.azure.com/${encodeURIComponent(credentials.organization)}/${encodeURIComponent(credentials.projectName)}/_workitems/edit/${encodeURIComponent(workItemId)}`,
    },
  };

  private readonly logger = inject(NGXLogger);

  constructor(
    private readonly integrationCredService: IntegrationCredentialsService,
    private readonly electronService: ElectronService,
  ) {}

  /**
   * Generate the URL to open a PMO item directly in the external tool
   * @param pmoId The PMO ID (e.g., Jira ticket key or ADO work item ID)
   * @param pmoType The PMO tool type ('jira' or 'ado')
   * @param projectMetadata The project metadata containing integration info
   * @returns Promise<string | null> The URL to open the item, or null if not available
   */
  async generatePmoUrl(
    pmoId: string,
    pmoType: PmoType,
    projectMetadata: IProjectMetadata,
  ): Promise<string | null> {
    if (!this.isValidInput(pmoId, pmoType, projectMetadata)) {
      return null;
    }

    try {
      const credentials = await this.getCredentials(pmoType, projectMetadata);
      return this.buildUrlFromCredentials(pmoType, credentials, pmoId);
    } catch (error) {
      this.logError(`Error generating ${pmoType} URL`, error, {
        pmoId,
        pmoType,
        projectId: projectMetadata.id,
      });
      return null;
    }
  }

  /**
   * Open PMO item in external application
   * @param pmoId The PMO ID
   * @param pmoType The PMO tool type
   * @param projectMetadata The project metadata
   * @returns Promise<boolean> True if successfully opened, false otherwise
   */
  async openPmoItem(
    pmoId: string,
    pmoType: PmoType,
    projectMetadata: IProjectMetadata,
  ): Promise<boolean> {
    try {
      const url = await this.generatePmoUrl(pmoId, pmoType, projectMetadata);
      if (!url) {
        this.logError('Failed to generate PMO URL', null, { pmoId, pmoType });
        return false;
      }

      await this.electronService.openExternalUrl(url);
      return true;
    } catch (error) {
      this.logError('Error opening PMO item', error, { pmoId, pmoType });
      return false;
    }
  }

  /**
   * Check if PMO integration is available for a project
   * @param pmoType The PMO tool type
   * @param projectMetadata The project metadata
   * @returns Promise<boolean> True if integration is available
   */
  async isPmoIntegrationAvailable(
    pmoType: PmoType,
    projectMetadata: IProjectMetadata,
  ): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(pmoType, projectMetadata);
      const generator = this.urlGenerators[pmoType];
      return generator?.validateCredentials(credentials) ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Validate input parameters
   */
  private isValidInput(
    pmoId: string,
    pmoType: PmoType,
    projectMetadata: IProjectMetadata,
  ): boolean {
    return Boolean(
      pmoId?.trim() &&
        pmoType &&
        Object.values(PMO_TYPES).includes(pmoType) &&
        projectMetadata?.id &&
        projectMetadata?.name,
    );
  }

  /**
   * Get credentials for the specified PMO type
   */
  private async getCredentials(
    pmoType: PmoType,
    projectMetadata: IProjectMetadata,
  ): Promise<JiraCredentials | AdoCredentials | null> {
    return this.integrationCredService.getCredentials(
      projectMetadata.name,
      projectMetadata.id,
      pmoType,
    );
  }

  /**
   * Build URL from credentials using the appropriate generator
   */
  private buildUrlFromCredentials(
    pmoType: PmoType,
    credentials: any,
    itemId: string,
  ): string | null {
    const generator = this.urlGenerators[pmoType];

    if (!generator || !generator.validateCredentials(credentials)) {
      return null;
    }

    try {
      return generator.buildUrl(credentials, itemId);
    } catch (error) {
      this.logError(`Error building ${pmoType} URL`, error, { itemId });
      return null;
    }
  }

  private logError(
    message: string,
    error: any,
    context?: Record<string, any>,
  ): void {
    const logContext = context ? ` Context: ${JSON.stringify(context)}` : '';
    this.logger.error(`[PmoUrlService] ${message}${logContext}`, error);
  }
}
