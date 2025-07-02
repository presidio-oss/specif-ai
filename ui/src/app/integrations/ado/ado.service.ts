import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, take } from 'rxjs';
import { Ticket } from '../../services/pmo-integration/pmo-integration.service';
import { PmoService } from '../../services/pmo-integration/pmo-service.interface';
import { ElectronService } from '../../electron-bridge/electron.service';
import { Store } from '@ngxs/store';
import { ProjectsState } from 'src/app/store/projects/projects.state';

interface AdoConfiguration {
  personalAccessToken: string;
  organization: string;
  projectName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdoService implements PmoService {
  private baseUrl: string | null = null;
  private config: AdoConfiguration | null = null;

  constructor(
    private http: HttpClient,
    private electronService: ElectronService,
    private store: Store,
  ) {}

  /**
   * Configure the ADO service with your organization, project and PAT
   */
  async configure(): Promise<void> {
    const metadata = await lastValueFrom(
      this.store.select(ProjectsState.getMetadata).pipe(take(1)),
    );

    this.config = metadata?.integration?.ado;

    if (!this.config) {
      throw new Error(
        'Azure DevOps credentials not configured. Please configure the integration first.',
      );
    }
    this.baseUrl = `https://dev.azure.com/${this.config.organization}/${this.config.projectName}`;
  }

  /**
   * Validate ADO credentials and connection
   */
  async validateCredentials(): Promise<{
    isValid: boolean;
    errorMessage?: string;
  }> {
    try {
      if (!this.config) {
        throw new Error(
          'Azure DevOps service not configured. Call configure() first.',
        );
      }
      return await this.electronService.validateAdoCredentials(
        this.config.organization,
        this.config.projectName,
        this.config.personalAccessToken!,
      );
    } catch (error) {
      return {
        isValid: false,
        errorMessage:
          'Failed to connect to Azure DevOps. Please check your credentials and try again.',
      };
    }
  }

  /**
   * Get work items by their IDs
   */
  private async getWorkItemsByIds(ids: number[]): Promise<any[]> {
    if (!ids.length) return [];
    if (!this.baseUrl) {
      throw new Error('Azure DevOps service not configured');
    }

    // Create comma-separated list of IDs
    const idList = ids.join(',');

    // Specify fields to retrieve
    const fields = [
      'System.Id',
      'System.Title',
      'System.State',
      'System.Description',
      'System.WorkItemType',
    ].join(',');

    // Use the correct API URL format for work items
    const url = `${this.baseUrl}/_apis/wit/workitems?ids=${idList}&fields=${fields}&api-version=6.0`;

    const options = this.getRequestOptions();

    try {
      const proxyUrl = this.getCorsProxyUrl(url);
      const response = await lastValueFrom(
        this.http.get<{ value: any[] }>(proxyUrl, options),
      );

      return response.value || [];
    } catch (error) {
      console.error('Error fetching work items by IDs:', error);
      throw error;
    }
  }

  /**
   * Fetch Features, PlatformFeatures, and UserStories in a hierarchical structure
   * This creates a three-level hierarchy that can be displayed in a tree view
   * Mapped to the Ticket interface for PMO integration
   */
  async getFeaturesHierarchy(): Promise<Ticket[]> {
    if (!this.config || !this.baseUrl) {
      console.error(
        'Azure DevOps service not configured. Call configure() first.',
      );
      return [];
    }

    try {
      // 1. Get Features
      const query = `
        SELECT [System.Id]
        FROM WorkItems
        WHERE [System.WorkItemType] = 'Feature'
        AND [System.TeamProject] = @project
        ORDER BY [System.ChangedDate] DESC
      `;

      const featureIds = await this.executeWiqlQuery(query);
      if (featureIds.length === 0) {
        return [];
      }

      const features = await this.getWorkItemsByIds(featureIds);

      // 2. Build the hierarchy
      const hierarchy = await Promise.all(
        features.map(async (feature: any) => {
          try {
            // Get PlatformFeatures for this Feature
            const platformFeatures = await this.getPlatformFeaturesByParentId(
              feature.id,
            );

            // For each PlatformFeature, get its User Stories
            const platformFeaturesWithUserStories = await Promise.all(
              platformFeatures.map(async (platformFeature: any) => {
                try {
                  const userStories = await this.getUserStoriesByParentId(
                    platformFeature.id,
                  );

                  // Map User Stories to Ticket structure
                  const userStoryTickets: Ticket[] = userStories.map(
                    (userStory: any) => {
                      return {
                        // PMO details
                        pmoId: userStory.id.toString(),
                        pmoIssueType: userStory.fields['System.WorkItemType'],
                        pmoParentId: platformFeature.id.toString(),

                        // Specifai mapping
                        specifaiId: `TASK${userStory.id}`, // Generate a temporary Specifai ID
                        specifaiType: 'Task', // Map User Stories to Tasks in Specifai
                        specifaiParentId: `US${platformFeature.id}`, // Reference to parent User Story in Specifai

                        // Common details
                        title: userStory.fields['System.Title'],
                        description:
                          userStory.fields['System.Description'] || null,

                        // Empty children array
                        child: [],
                      };
                    },
                  );

                  // Map Platform Feature to Ticket structure
                  return {
                    // PMO details
                    pmoId: platformFeature.id.toString(),
                    pmoIssueType: platformFeature.fields['System.WorkItemType'],
                    pmoParentId: feature.id.toString(),

                    // Specifai mapping
                    specifaiId: `US${platformFeature.id}`, // Generate a temporary Specifai ID
                    specifaiType: 'User Story', // Map Platform Features to User Stories in Specifai
                    specifaiParentId: `PRD${feature.id}`, // Reference to parent PRD in Specifai

                    // Common details
                    title: platformFeature.fields['System.Title'],
                    description:
                      platformFeature.fields['System.Description'] || null,

                    // Children are User Stories
                    child: userStoryTickets,
                  };
                } catch (error) {
                  console.error(
                    `Error fetching UserStories for PlatformFeature ${platformFeature.id}`,
                  );
                  return {
                    pmoId: platformFeature.id.toString(),
                    pmoIssueType: platformFeature.fields['System.WorkItemType'],
                    pmoParentId: feature.id.toString(),
                    specifaiId: `US${platformFeature.id}`,
                    specifaiType: 'User Story',
                    specifaiParentId: `PRD${feature.id}`,
                    title: platformFeature.fields['System.Title'],
                    description:
                      platformFeature.fields['System.Description'] || null,
                    child: [],
                  };
                }
              }),
            );

            // Map Feature to Ticket structure
            return {
              // PMO details
              pmoId: feature.id.toString(),
              pmoIssueType: feature.fields['System.WorkItemType'],
              pmoParentId: null, // Top-level items have no parent

              // Specifai mapping
              specifaiId: `PRD${feature.id}`, // Generate a temporary Specifai ID
              specifaiType: 'PRD', // Map Features to PRDs in Specifai
              specifaiParentId: null, // Top-level items have no parent

              // Common details
              title: feature.fields['System.Title'],
              description: feature.fields['System.Description'] || null,

              // Children are Platform Features
              child: platformFeaturesWithUserStories,
            };
          } catch (error) {
            console.error(
              `Error fetching PlatformFeatures for Feature ${feature.id}`,
            );
            return {
              pmoId: feature.id.toString(),
              pmoIssueType: feature.fields['System.WorkItemType'],
              pmoParentId: null,
              specifaiId: `PRD${feature.id}`,
              specifaiType: 'PRD',
              specifaiParentId: null,
              title: feature.fields['System.Title'],
              description: feature.fields['System.Description'] || null,
              child: [],
            };
          }
        }),
      );

      return hierarchy;
    } catch (err) {
      console.error('Error fetching Features hierarchy:', err);
      return [];
    }
  }

  /**
   * Get work items of a specific type for a parent ID
   * @private
   * @param parentId The ID of the parent work item
   * @param workItemType The type of work items to fetch (e.g., 'PlatformFeature', 'User Story')
   * @returns Array of work items
   */
  private async getWorkItemsByParentIdAndType(
    parentId: number,
    workItemType: string,
  ): Promise<any[]> {
    if (!this.baseUrl) {
      throw new Error('Azure DevOps service not configured');
    }

    // Create the WIQL query
    const query = `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.WorkItemType] = '${workItemType}' 
      AND [System.Parent] = ${parentId}
      ORDER BY [System.ChangedDate] DESC
    `;

    try {
      const itemIds = await this.executeWiqlQuery(query);
      return await this.getWorkItemsByIds(itemIds);
    } catch (error) {
      console.error(
        `Error fetching ${workItemType} items for parent ${parentId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get only PlatformFeature work items for a specific parent Feature
   */
  private async getPlatformFeaturesByParentId(
    parentId: number,
  ): Promise<any[]> {
    return this.getWorkItemsByParentIdAndType(parentId, 'Platform Feature');
  }

  /**
   * Get only UserStory work items for a specific parent PlatformFeature
   */
  private async getUserStoriesByParentId(parentId: number): Promise<any[]> {
    return this.getWorkItemsByParentIdAndType(parentId, 'User Story');
  }

  /**
   * Create HTTP request options with authorization header
   */
  private getRequestOptions() {
    if (!this.config) {
      throw new Error('Azure DevOps service not configured');
    }

    // Create auth header with Personal Access Token
    const pat = this.config.personalAccessToken;
    const base64Pat = btoa(`:${pat}`);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Basic ${base64Pat}`,
      // Add header to disable interceptors if they're causing issues
      'X-Skip-Interceptor': 'true',
      // CORS headers
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Origin, Content-Type, Accept, Authorization, X-Request-With',
    });

    return {
      headers,
      // Add error handling for better diagnostics
      observe: 'body' as const,
      responseType: 'json' as const,
      // Bypass caching for API requests
      withCredentials: false,
    };
  }

  /**
   * Create a URL for a proxy service to bypass CORS restrictions
   * Note: This assumes you are using a CORS proxy
   */
  private getCorsProxyUrl(url: string): string {
    // For development, you can use a CORS proxy if needed
    // Uncomment and modify this if you need to use a CORS proxy
    // return `https://cors-anywhere.herokuapp.com/${url}`;

    // Or if you have a local proxy configured in your Angular app
    // return `/api/proxy?url=${encodeURIComponent(url)}`;

    // For now, return the original URL
    return url;
  }

  /**
   * Execute a WIQL query and return the result
   * @param query The WIQL query string
   * @returns An array of work item IDs
   */
  private async executeWiqlQuery(query: string): Promise<number[]> {
    if (!this.baseUrl) {
      throw new Error('Azure DevOps service not configured');
    }

    const url = `${this.baseUrl}/_apis/wit/wiql?api-version=6.0`;
    const wiqlQuery = { query };
    const options = this.getRequestOptions();

    try {
      const proxyUrl = this.getCorsProxyUrl(url);
      const response = await lastValueFrom(
        this.http.post<{ workItems: { id: number }[] }>(
          proxyUrl,
          wiqlQuery,
          options,
        ),
      );

      if (!response.workItems || response.workItems.length === 0) {
        return [];
      }

      // Extract and return the IDs
      return response.workItems.map((item: { id: number }) => item.id);
    } catch (error) {
      console.error('Error executing WIQL query:', error);
      throw error;
    }
  }
}
