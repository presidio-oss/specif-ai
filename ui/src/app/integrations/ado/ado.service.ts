import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, take, first } from 'rxjs';
import { Ticket } from '../../services/pmo-integration/pmo-integration.service';
import { PmoService } from '../../services/pmo-integration/pmo-service.interface';
import { ElectronService } from '../../electron-bridge/electron.service';
import { Store } from '@ngxs/store';
import { ProjectsState } from 'src/app/store/projects/projects.state';
import {
  BulkReadFiles,
  BulkUpdateFiles,
  GetProjectFiles,
  ReadFile,
} from '../../store/projects/projects.actions';
import { ToasterService } from '../../services/toaster/toaster.service';
import { Router } from '@angular/router';
import { IProjectMetadata } from 'src/app/model/interfaces/projects.interface';

const ADO_API_VERSION = '7.1';

interface AdoConfiguration {
  personalAccessToken: string;
  organization: string;
  projectName: string;
  workItemTypeMapping?: {
    PRD: string;
    US: string;
    TASK: string;
  };
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
    private toast: ToasterService,
    private router: Router,
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
    const url = `${this.baseUrl}/_apis/wit/workitems?ids=${idList}&fields=${fields}&api-version=${ADO_API_VERSION}`;

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
  async getWorkPlanItemsHierarchy(): Promise<Ticket[]> {
    if (!this.config || !this.baseUrl) {
      console.error(
        'Azure DevOps service not configured. Call configure() first.',
      );
      return [];
    }

    try {
      // 1. Get current document hierarchy from SpecifAI to determine existing mappings
      const currentHierarchy = await this.getCurrentDocumentHierarchy('PRD');

      const existingPmoToSpecifaiMap = new Map<
        string,
        {
          specifaiId: string;
          specifaiType: string;
          specifaiParentId: string | null;
        }
      >();

      const buildMappingFromHierarchy = (tickets: Ticket[]) => {
        tickets.forEach((ticket) => {
          if (ticket.pmoId) {
            existingPmoToSpecifaiMap.set(ticket.pmoId, {
              specifaiId: ticket.specifaiId,
              specifaiType: ticket.specifaiType,
              specifaiParentId: ticket.specifaiParentId,
            });
          }
          // Recursively process children
          if (ticket.child && ticket.child.length > 0) {
            buildMappingFromHierarchy(ticket.child);
          }
        });
      };
      buildMappingFromHierarchy(currentHierarchy);

      // 2. Get Features from ADO
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

      // 3. Build the hierarchy using existing mappings where available
      const hierarchy = await Promise.all(
        features.map(async (feature: any) => {
          try {
            const featurePmoId = feature.id.toString();
            const existingFeatureMapping =
              existingPmoToSpecifaiMap.get(featurePmoId);
            const isFeatureUpdate = !!existingFeatureMapping;

            // Get PlatformFeatures for this Feature
            const platformFeatures = await this.getPlatformFeaturesByParentId(
              feature.id,
            );

            // For each PlatformFeature, get its User Stories
            const platformFeaturesWithUserStories = await Promise.all(
              platformFeatures.map(async (platformFeature: any) => {
                try {
                  const platformFeaturePmoId = platformFeature.id.toString();
                  const existingPlatformFeatureMapping =
                    existingPmoToSpecifaiMap.get(platformFeaturePmoId);
                  const isPlatformFeatureUpdate =
                    !!existingPlatformFeatureMapping;

                  const userStories = await this.getUserStoriesByParentId(
                    platformFeature.id,
                  );

                  // Map User Stories to Ticket structure
                  const userStoryTickets: Ticket[] = userStories.map(
                    (userStory: any) => {
                      const userStoryPmoId = userStory.id.toString();
                      const existingUserStoryMapping =
                        existingPmoToSpecifaiMap.get(userStoryPmoId);
                      const isUserStoryUpdate = !!existingUserStoryMapping;

                      return {
                        // PMO details
                        pmoId: userStoryPmoId,
                        pmoIssueType: userStory.fields['System.WorkItemType'],
                        pmoParentId: platformFeaturePmoId,

                        // Specifai mapping
                        specifaiId: `TASK${userStory.id}`,
                        specifaiType:
                          existingUserStoryMapping?.specifaiType || 'Task',
                        specifaiParentId:
                          existingPlatformFeatureMapping?.specifaiId ||
                          `US${platformFeature.id}`,
                        isUpdate: isUserStoryUpdate,

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
                    pmoId: platformFeaturePmoId,
                    pmoIssueType: platformFeature.fields['System.WorkItemType'],
                    pmoParentId: featurePmoId,

                    // Specifai mapping
                    specifaiId: `US${platformFeature.id}`,
                    specifaiType:
                      existingPlatformFeatureMapping?.specifaiType ||
                      'User Story',
                    specifaiParentId:
                      existingFeatureMapping?.specifaiId || `PRD${feature.id}`,

                    // Common details
                    title: platformFeature.fields['System.Title'],
                    description:
                      platformFeature.fields['System.Description'] || null,

                    // Children are User Stories
                    child: userStoryTickets,
                    isUpdate: isPlatformFeatureUpdate,
                  };
                } catch (error) {
                  console.error(
                    `Error fetching UserStories for PlatformFeature ${platformFeature.id}`,
                  );
                  const platformFeaturePmoId = platformFeature.id.toString();
                  const existingPlatformFeatureMapping =
                    existingPmoToSpecifaiMap.get(platformFeaturePmoId);
                  const isPlatformFeatureUpdate =
                    !!existingPlatformFeatureMapping;

                  return {
                    pmoId: platformFeaturePmoId,
                    pmoIssueType: platformFeature.fields['System.WorkItemType'],
                    pmoParentId: featurePmoId,
                    specifaiId: `US${platformFeature.id}`,
                    specifaiType:
                      existingPlatformFeatureMapping?.specifaiType ||
                      'User Story',
                    specifaiParentId:
                      existingFeatureMapping?.specifaiId || `PRD${feature.id}`,
                    title: platformFeature.fields['System.Title'],
                    description:
                      platformFeature.fields['System.Description'] || null,
                    child: [],
                    isUpdate: isPlatformFeatureUpdate,
                  };
                }
              }),
            );

            // Map Feature to Ticket structure
            return {
              // PMO details
              pmoId: featurePmoId,
              pmoIssueType: feature.fields['System.WorkItemType'],
              pmoParentId: null, // Top-level items have no parent

              // Specifai mapping
              specifaiId: `PRD${feature.id}`,
              specifaiType: existingFeatureMapping?.specifaiType || 'PRD',
              specifaiParentId: null, // Top-level items have no parent

              // Common details
              title: feature.fields['System.Title'],
              description: feature.fields['System.Description'] || null,

              // Children are Platform Features
              child: platformFeaturesWithUserStories,
              isUpdate: isFeatureUpdate,
            };
          } catch (error) {
            console.error(
              `Error fetching PlatformFeatures for Feature ${feature.id}`,
            );
            const featurePmoId = feature.id.toString();
            const existingFeatureMapping =
              existingPmoToSpecifaiMap.get(featurePmoId);
            const isFeatureUpdate = !!existingFeatureMapping;

            return {
              pmoId: featurePmoId,
              pmoIssueType: feature.fields['System.WorkItemType'],
              pmoParentId: null,
              specifaiId: `PRD${feature.id}`,
              specifaiType: existingFeatureMapping?.specifaiType || 'PRD',
              specifaiParentId: null,
              title: feature.fields['System.Title'],
              description: feature.fields['System.Description'] || null,
              child: [],
              isUpdate: isFeatureUpdate,
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
      skipLoader: 'true',
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

    const url = `${this.baseUrl}/_apis/wit/wiql?api-version=${ADO_API_VERSION}`;
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

  /**
   * Navigate to ADO configuration page or open settings
   */
  navigateToAdoConfiguration(appInfo: any): void {
    // Create the state object to pass with navigation
    const navState = {
      data: appInfo,
      selectedFolder: {
        title: 'app-integrations',
        id: appInfo?.id,
        metadata: appInfo,
      },
      selectedIntegration: 'ado',
      openPmoAccordion: true,
    };

    // Check if we're already on the apps/{id} page
    const currentUrl = this.router.url;
    const targetUrl = `/apps/${appInfo?.id}`;

    if (currentUrl === targetUrl) {
      const event = new CustomEvent('open-pmo-integration', {
        detail: navState,
      });
      window.dispatchEvent(event);
    } else {
      this.router.navigate([targetUrl], { state: navState });
    }
  }

  /**
   * Process selected ADO items and create/update PRD files
   * @param folderName The folder name
   * @param action The action (pull or push)
   * @param selectedItems The items selected in the ADO integration modal
   * @param appInfo The application info/metadata
   */
  processAdoSelectedItems(
    folderName: string,
    action: 'pull' | 'push',
    selectedItems: {
      prds: Ticket[];
      userStories: Ticket[];
      tasks: Ticket[];
    },
    appInfo: any,
  ): void {
    console.log(
      `Processing ADO items for ${folderName} with action: ${action}`,
      selectedItems,
    );
    console.log('Project metadata:', appInfo);

    if (action === 'pull') {
      try {
        // First, get the existing PRD files to check for pmoId and get max PRD number
        this.getExistingPrdFiles(appInfo)
          .then((existingData) => {
            const { maxPrdNumber, existingPmoMap, existingFeatureFiles } =
              existingData;

            // Group tickets by parent relationship
            const ticketGroups =
              this.groupTicketsByParentRelationship(selectedItems);

            // Prepare updates array for BulkUpdateFiles action
            const updates: { path: string; content: any }[] = [];

            // Process each PRD (Feature from ADO)
            ticketGroups.forEach((group, index) => {
              const prd = group.prd;

              // Check if this PRD already exists based on pmoId
              const existingPrd = existingPmoMap.prds[prd.pmoId];

              // Determine PRD ID - use existing or generate new one with zero-padding (PRD01, PRD02, etc.)
              const prdId = existingPrd
                ? existingPrd.specifaiId
                : `PRD${String(maxPrdNumber + index + 1).padStart(2, '0')}`;

              // Format the user stories and tasks for this PRD
              const features = this.formatFeaturesForPrd(
                group.userStories,
                group.tasks,
                existingPmoMap,
              );

              // Create the PRD base file content with correct structure
              const prdBaseContent = {
                id: prdId,
                title: prd.title,
                requirement: prd.description || '', // Map description to requirement field
                state: 'Active',
                createdAt: existingPrd
                  ? new Date().toISOString()
                  : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                pmoId: prd.pmoId, // Store ADO ID for future reference
                pmoIssueType: prd.pmoIssueType,
                chatHistory: [], // Add empty chatHistory array as required
              };

              // Check if there's an existing feature file for this PRD
              const featureFilePath = `prd/${prdId}-feature.json`;
              const existingFeatureFile = existingFeatureFiles[prdId];

              let prdFeatureContent: any = { features: features };

              // If this PRD exists and we have the feature file content, merge with new features
              if (existingPrd && existingFeatureFile) {
                const existingFeatures = existingFeatureFile.features || [];

                // Create a map of existing features by pmoId for easy lookup
                const existingFeatureMap = new Map<string, any>();
                existingFeatures.forEach((feature: any) => {
                  if (feature.pmoId) {
                    existingFeatureMap.set(feature.pmoId, feature);
                  }
                });

                // Merge or update features
                const mergedFeatures = features.map((newFeature) => {
                  const existingFeature = existingFeatureMap.get(
                    newFeature.pmoId,
                  );

                  // If this feature already exists, update its properties but preserve any
                  // that might be set in the UI and not coming from ADO
                  if (existingFeature) {
                    existingFeatureMap.delete(newFeature.pmoId); // Remove from map to track what's processed

                    // Create a map of existing tasks by pmoId
                    const existingTaskMap = new Map<string, any>();
                    (existingFeature.tasks || []).forEach((task: any) => {
                      if (task.pmoId) {
                        existingTaskMap.set(task.pmoId, task);
                      }
                    });

                    // Merge tasks within this feature
                    const mergedTasks = (newFeature.tasks || []).map(
                      (newTask: any) => {
                        const existingTask = existingTaskMap.get(newTask.pmoId);

                        // If task exists, update it
                        if (existingTask) {
                          existingTaskMap.delete(newTask.pmoId); // Remove from map to track what's processed
                          return {
                            ...existingTask,
                            list: newTask.list,
                            acceptance:
                              newTask.acceptance || existingTask.acceptance,
                            // Keep other properties from existing task
                          };
                        }

                        // This is a new task
                        return newTask;
                      },
                    );

                    // Add any remaining existing tasks that weren't in the new data
                    existingTaskMap.forEach((remainingTask) => {
                      mergedTasks.push(remainingTask);
                    });

                    // Return the merged feature
                    return {
                      ...existingFeature,
                      name: newFeature.name,
                      description:
                        newFeature.description || existingFeature.description,
                      tasks: mergedTasks,
                      // Keep other properties from existing feature
                    };
                  }

                  // This is a new feature
                  return newFeature;
                });

                // Add any remaining existing features that weren't in the new data
                existingFeatureMap.forEach((remainingFeature) => {
                  mergedFeatures.push(remainingFeature);
                });

                // Update the feature content with merged features
                prdFeatureContent = {
                  ...existingFeatureFile,
                  features: mergedFeatures,
                };
              }

              // Log what we're saving for debugging
              console.log(
                `Creating/updating PRD base file: ${prdId}-base.json`,
                prdBaseContent,
              );
              console.log(
                `Creating/updating PRD feature file: ${prdId}-feature.json`,
                prdFeatureContent,
              );

              // Add PRD files to updates
              updates.push({
                path: `prd/${prdId}-base.json`,
                content: prdBaseContent,
              });

              updates.push({
                path: featureFilePath,
                content: prdFeatureContent,
              });
            });

            // If we have updates, dispatch the BulkUpdateFiles action
            if (updates.length > 0) {
              // Calculate the new max PRD number after adding all new PRDs
              const newMaxPrdNumber =
                maxPrdNumber +
                ticketGroups.filter((group) => {
                  const prd = group.prd;
                  return !existingPmoMap.prds[prd.pmoId]; // Only count new PRDs
                }).length;

              // Update the metadata with the new PRD count
              this.updatePrdCountInMetadata(newMaxPrdNumber, appInfo);

              this.store.dispatch(new BulkUpdateFiles(updates));
              this.toast.showSuccess(
                `Successfully imported ${ticketGroups.length} PRDs with their user stories and tasks from ADO`,
              );

              // Refresh the file list
              const projectId = appInfo?.id;
              if (projectId) {
                this.store.dispatch(new GetProjectFiles(projectId));
              }
            } else {
              this.toast.showInfo('No items to import from ADO');
            }
          })
          .catch((error) => {
            console.error('Error processing ADO items:', error);
            this.toast.showError('Failed to process ADO items');
          });
      } catch (error) {
        console.error('Error importing items from ADO:', error);
        this.toast.showError('Failed to import items from ADO');
      }
    } else {
      (async () => {
        try {
          // Map to keep track of PRD/UserStory/Task pmoId <-> ADO ID
          const prdAdoIdMap: { [specifaiId: string]: number } = {};
          const userStoryAdoIdMap: { [specifaiId: string]: number } = {};
          const taskAdoIdMap: { [specifaiId: string]: number } = {};

          // 1. Push PRDs (Features)
          for (const prd of selectedItems.prds) {
            const adoId = await this.createOrUpdateWorkItem(prd);
            prdAdoIdMap[prd.specifaiId] = adoId;
            prd.pmoId = adoId.toString();
          }

          // 2. Push User Stories (Platform Features)
          for (const us of selectedItems.userStories) {
            // Find parent PRD's ADO ID
            const parentSpecifaiId = us.specifaiParentId;
            const parentAdoId = parentSpecifaiId
              ? prdAdoIdMap[parentSpecifaiId]
              : undefined;
            const adoId = await this.createOrUpdateWorkItem(us, parentAdoId);
            userStoryAdoIdMap[us.specifaiId] = adoId;
            us.pmoId = adoId.toString();
          }

          // 3. Push Tasks (User Stories)
          for (const task of selectedItems.tasks) {
            // Find parent User Story's ADO ID
            const parentSpecifaiId = task.specifaiParentId;
            const parentAdoId = parentSpecifaiId
              ? userStoryAdoIdMap[parentSpecifaiId]
              : undefined;
            const adoId = await this.createOrUpdateWorkItem(task, parentAdoId);
            taskAdoIdMap[task.specifaiId] = adoId;
            task.pmoId = adoId.toString();
          }

          this.updateLocalFilesWithAdoIds(selectedItems, appInfo);
        } catch (error) {
          console.error('Error pushing items to ADO:', error);
          this.toast.showError('Failed to push items to ADO');
        }
      })();
    }
  }

  /**
   * Fetch existing PRD files and analyze them to find max PRD number and existing pmoIds
   * @returns Promise with information about existing PRD files
   */
  private getExistingPrdFiles(appInfo: any): Promise<{
    maxPrdNumber: number;
    existingPmoMap: {
      prds: { [pmoId: string]: { specifaiId: string; path: string } };
      userStories: { [pmoId: string]: { specifaiId: string; path: string } };
      tasks: { [pmoId: string]: { specifaiId: string; path: string } };
    };
    existingFeatureFiles: { [prdId: string]: any };
  }> {
    return new Promise((resolve, reject) => {
      // Get all PRD files from the project
      this.store
        .select(ProjectsState.getProjectsFolders)
        .pipe(first())
        .subscribe(
          (directories) => {
            try {
              // Find the PRD directory
              const prdDir = directories.find((dir) => dir.name === 'PRD');

              if (!prdDir || !prdDir.children || prdDir.children.length === 0) {
                // No PRD files exist yet
                resolve({
                  maxPrdNumber: 0,
                  existingPmoMap: { prds: {}, userStories: {}, tasks: {} },
                  existingFeatureFiles: {},
                });
                return;
              }

              // Get all feature files (PRD*-feature.json)
              const featureFiles = prdDir.children.filter(
                (file) =>
                  file.includes('-feature.json') && !file.includes('-archived'),
              );

              // Get all base files (PRD*-base.json)
              const baseFiles = prdDir.children.filter(
                (file) =>
                  file.includes('-base.json') && !file.includes('-archived'),
              );

              // Find max PRD number - use the regex to match PRD with any number format
              let maxPrdNumber = 0;
              const prdRegex = /PRD(\d+)[-]/;

              console.log('Project metadata for PRD count:', appInfo);

              // Check if we have project metadata with prdCount
              if (appInfo && appInfo.prdCount) {
                // Use the value from metadata.json
                maxPrdNumber = parseInt(appInfo.prdCount, 10);
              } else {
                // Fall back to scanning file names
                baseFiles.forEach((file) => {
                  const match = file.match(prdRegex);
                  if (match && match[1]) {
                    // Handle both PRD1 and PRD01 formats by stripping leading zeros
                    const prdNumber = parseInt(match[1], 10);
                    if (prdNumber > maxPrdNumber) {
                      maxPrdNumber = prdNumber;
                    }
                  }
                });
              }

              // Initialize mapping objects for existing items with pmoId
              const existingPmoMap = {
                prds: {} as {
                  [pmoId: string]: { specifaiId: string; path: string };
                },
                userStories: {} as {
                  [pmoId: string]: { specifaiId: string; path: string };
                },
                tasks: {} as {
                  [pmoId: string]: { specifaiId: string; path: string };
                },
              };

              // Object to store existing feature files content
              const existingFeatureFiles: { [prdId: string]: any } = {};

              // Process base files to find PRDs with pmoId
              const baseFilePromises = baseFiles.map((file) => {
                return new Promise<void>((resolveFile) => {
                  // Extract PRD ID from filename
                  const prdMatch = file.match(prdRegex);
                  if (!prdMatch || !prdMatch[1]) {
                    resolveFile();
                    return;
                  }

                  // Ensure consistent format with zero-padding (PRD01, PRD02, etc.)
                  const prdNumber = parseInt(prdMatch[1], 10);
                  const prdId = `PRD${String(prdNumber).padStart(2, '0')}`;

                  // Read the base file to check for pmoId
                  this.store
                    .dispatch(new ReadFile(`prd/${file}`))
                    .pipe(first())
                    .subscribe({
                      next: () => {
                        // Get the file content from state
                        this.store
                          .select(ProjectsState.getSelectedFileContent)
                          .pipe(first())
                          .subscribe((content) => {
                            // Check for pmoId in both formats (old and new structure)
                            if (content && content.pmoId) {
                              // Store mapping of pmoId to specifaiId for PRDs
                              existingPmoMap.prds[content.pmoId] = {
                                specifaiId: prdId,
                                path: `prd/${file}`,
                              };
                            }
                            resolveFile();
                          });
                      },
                      error: () => {
                        // Ignore errors and continue
                        resolveFile();
                      },
                    });
                });
              });

              // Process feature files to find user stories and tasks with pmoId
              const featureFilePromises = featureFiles.map((file) => {
                return new Promise<void>((resolveFile) => {
                  // Extract PRD ID from filename
                  const prdMatch = file.match(prdRegex);
                  if (!prdMatch || !prdMatch[1]) {
                    resolveFile();
                    return;
                  }

                  // Ensure consistent format with zero-padding (PRD01, PRD02, etc.)
                  const prdNumber = parseInt(prdMatch[1], 10);
                  const prdId = `PRD${String(prdNumber).padStart(2, '0')}`;

                  // Read the feature file to check for user stories and tasks with pmoId
                  this.store
                    .dispatch(new ReadFile(`prd/${file}`))
                    .pipe(first())
                    .subscribe({
                      next: () => {
                        // Get the file content from state
                        this.store
                          .select(ProjectsState.getSelectedFileContent)
                          .pipe(first())
                          .subscribe((content) => {
                            // Store the feature file content
                            existingFeatureFiles[prdId] = content;

                            // Process features (user stories) and their tasks
                            if (
                              content &&
                              content.features &&
                              Array.isArray(content.features)
                            ) {
                              content.features.forEach((feature: any) => {
                                if (feature.pmoId) {
                                  // Store mapping of pmoId to specifaiId for user stories
                                  existingPmoMap.userStories[feature.pmoId] = {
                                    specifaiId: feature.id,
                                    path: `prd/${file}`,
                                  };
                                }

                                // Process tasks
                                if (
                                  feature.tasks &&
                                  Array.isArray(feature.tasks)
                                ) {
                                  feature.tasks.forEach((task: any) => {
                                    if (task.pmoId) {
                                      // Store mapping of pmoId to specifaiId for tasks
                                      existingPmoMap.tasks[task.pmoId] = {
                                        specifaiId: task.id,
                                        path: `prd/${file}`,
                                      };
                                    }
                                  });
                                }
                              });
                            }
                            resolveFile();
                          });
                      },
                      error: () => {
                        // Ignore errors and continue
                        resolveFile();
                      },
                    });
                });
              });

              // Wait for all file reading to complete
              Promise.all([...baseFilePromises, ...featureFilePromises])
                .then(() => {
                  resolve({
                    maxPrdNumber,
                    existingPmoMap,
                    existingFeatureFiles,
                  });
                })
                .catch((error) => {
                  reject(error);
                });
            } catch (error) {
              reject(error);
            }
          },
          (error) => reject(error),
        );
    });
  }

  /**
   * Update the PRD count in the project metadata if needed
   * @param newPrdCount The new PRD count
   * @param appInfo The application info/metadata
   */
  private updatePrdCountInMetadata(newPrdCount: number, appInfo: any): void {
    // Only update if we have appInfo and the new count is higher than the current one
    if (appInfo) {
      const currentCount = appInfo.prdCount
        ? parseInt(appInfo.prdCount, 10)
        : 0;

      if (newPrdCount > currentCount) {
        // Create a copy of the metadata to update
        const updatedMetadata = {
          ...appInfo,
          prdCount: String(newPrdCount),
        };

        // We should update the metadata in the project, but this would require
        // invoking the electron service to update the .metadata.json file
        // For now, just update our local copy
        // TODO: Implement updating metadata file
      }
    }
  }

  /**
   * Get current document hierarchy from SpecifAI for pushing to ADO
   * @param folderName The folder name (PRD, User Story, etc.)
   * @returns Promise with the document hierarchy
   */
  async getCurrentDocumentHierarchy(folderName: string): Promise<Ticket[]> {
    try {
      await this.store
        .dispatch(new BulkReadFiles('PRD'))
        .pipe(first())
        .toPromise();

      const prds = await lastValueFrom(
        this.store.select(ProjectsState.getSelectedFileContents).pipe(first()),
      );

      console.log('Current PRDs:', prds);

      // Transform PRDs into the Ticket structure
      const prdTickets: Ticket[] = [];

      for (const prd of prds) {
        // Skip if not a base file or if archived
        if (
          !prd.fileName.includes('-base.json') ||
          prd.fileName.includes('-archived')
        ) {
          continue;
        }

        const prdContent = prd.content;
        if (!prdContent) continue;

        // Extract PRD ID from filename (e.g., "PRD01" from "PRD01-base.json")
        const prdIdMatch = prd.fileName.match(/^(PRD\d+)/);
        if (!prdIdMatch) continue;

        const prdId = prdIdMatch[1];

        // Map PRD to Ticket structure
        const prdTicket: Ticket = {
          pmoId: (prdContent as any).pmoId || '', // Use existing pmoId if available
          pmoIssueType:
            (prdContent as any).pmoIssueType ||
            this.config?.workItemTypeMapping?.['PRD'] ||
            'Feature',
          pmoParentId: null,
          specifaiId: prdId,
          specifaiType: 'PRD',
          specifaiParentId: null,
          title: prdContent.title || 'Untitled PRD',
          description: prdContent.requirement || '',
          isUpdate: !!prdContent.pmoId,
          child: [],
        };

        console.log(`Processing PRD: `, prdTicket);

        // Get user stories for this PRD
        const userStories = await this.getUserStoriesForPrd(prdId);
        prdTicket.child = userStories;

        prdTickets.push(prdTicket);
      }

      return prdTickets;
    } catch (error) {
      console.error('Error getting current document hierarchy:', error);
      return [];
    }
  }

  /**
   * Get user stories for a specific PRD
   * @param prdId The PRD ID
   * @returns Promise with user stories as Tickets
   */
  private async getUserStoriesForPrd(prdId: string): Promise<Ticket[]> {
    try {
      // Read the feature file for this PRD
      const featureFilePath = `prd/${prdId}-feature.json`;

      await this.store
        .dispatch(new ReadFile(featureFilePath))
        .pipe(first())
        .toPromise();

      const featureContent = await lastValueFrom(
        this.store.select(ProjectsState.getSelectedFileContent).pipe(first()),
      );

      if (!featureContent || !featureContent.features) {
        return [];
      }

      // Transform features into user story tickets
      const userStoryTickets: Ticket[] = [];

      for (const feature of featureContent.features) {
        if (!feature.id) continue;

        const userStoryTicket: Ticket = {
          pmoId: feature.pmoId || '', // Use existing pmoId if available
          pmoIssueType:
            feature.pmoIssueType ||
            this.config?.workItemTypeMapping?.['US'] ||
            'Platform Feature',
          pmoParentId: null, // Will be set by ADO when creating
          specifaiId: feature.id,
          specifaiType: 'User Story',
          specifaiParentId: prdId,
          title: feature.name || 'Untitled User Story',
          description: feature.description || '',
          isUpdate: !!feature.pmoId,
          child: [],
        };

        // Transform tasks into task tickets
        const taskTickets: Ticket[] = [];

        if (feature.tasks && Array.isArray(feature.tasks)) {
          for (const task of feature.tasks) {
            if (!task.id) continue;

            const taskTicket: Ticket = {
              pmoId: task.pmoId || '', // Use existing pmoId if available
              pmoIssueType:
                task.pmoIssueType ||
                this.config?.workItemTypeMapping?.['TASK'] ||
                'User Story',
              pmoParentId: null, // Will be set by ADO when creating
              specifaiId: task.id,
              specifaiType: 'Task',
              specifaiParentId: userStoryTicket.specifaiId,
              title: task.list || 'Untitled Task',
              description: task.acceptance || '',
              isUpdate: !!task.pmoId,
              child: [],
            };

            taskTickets.push(taskTicket);
          }
        }

        userStoryTicket.child = taskTickets;
        userStoryTickets.push(userStoryTicket);
      }

      return userStoryTickets;
    } catch (error) {
      console.error(`Error getting user stories for PRD ${prdId}:`, error);
      return [];
    }
  }

  /**
   * Group tickets by their parent-child relationships
   * @param selectedItems Selected tickets from ADO
   * @returns Array of ticket groups, each containing a PRD and its related user stories and tasks
   */
  private groupTicketsByParentRelationship(selectedItems: {
    prds: Ticket[];
    userStories: Ticket[];
    tasks: Ticket[];
  }): Array<{
    prd: Ticket;
    userStories: Ticket[];
    tasks: { [userStoryId: string]: Ticket[] };
  }> {
    const ticketGroups: Array<{
      prd: Ticket;
      userStories: Ticket[];
      tasks: { [userStoryId: string]: Ticket[] };
    }> = [];

    // Process each PRD
    selectedItems.prds.forEach((prd) => {
      // Find user stories for this PRD
      const relatedUserStories = selectedItems.userStories.filter(
        (us) => us.pmoParentId === prd.pmoId,
      );

      // Create task map for this PRD
      const taskMap: { [userStoryId: string]: Ticket[] } = {};

      // Process each user story to find related tasks
      relatedUserStories.forEach((userStory) => {
        // Find tasks for this user story
        const relatedTasks = selectedItems.tasks.filter(
          (task) => task.pmoParentId === userStory.pmoId,
        );

        if (relatedTasks.length > 0) {
          taskMap[userStory.pmoId] = relatedTasks;
        }
      });

      // Add this PRD group
      ticketGroups.push({
        prd,
        userStories: relatedUserStories,
        tasks: taskMap,
      });
    });

    return ticketGroups;
  }

  /**
   * Format user stories and tasks into the features format required for PRD feature files
   * @param userStories User stories to include in the PRD
   * @param tasks Tasks mapped by user story ID
   * @param existingPmoMap Map of existing items with pmoId
   * @returns Array of formatted features
   */
  private formatFeaturesForPrd(
    userStories: Ticket[],
    tasks: { [userStoryId: string]: Ticket[] },
    existingPmoMap: {
      prds: { [pmoId: string]: { specifaiId: string; path: string } };
      userStories: { [pmoId: string]: { specifaiId: string; path: string } };
      tasks: { [pmoId: string]: { specifaiId: string; path: string } };
    },
  ): Array<any> {
    let nextUserStoryId = 1;
    let nextTaskId = 1;

    // Find the highest existing US and TASK IDs
    Object.values(existingPmoMap.userStories).forEach((item) => {
      const match = item.specifaiId.match(/US(\d+)/);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        if (id >= nextUserStoryId) {
          nextUserStoryId = id + 1;
        }
      }
    });

    Object.values(existingPmoMap.tasks).forEach((item) => {
      const match = item.specifaiId.match(/TASK(\d+)/);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        if (id >= nextTaskId) {
          nextTaskId = id + 1;
        }
      }
    });

    // Format user stories into features
    return userStories.map((userStory) => {
      // Determine user story ID - use existing or generate new one
      const userStoryId = existingPmoMap.userStories[userStory.pmoId]
        ? existingPmoMap.userStories[userStory.pmoId].specifaiId
        : `US${nextUserStoryId++}`;

      // Get tasks for this user story
      const userStoryTasks = tasks[userStory.pmoId] || [];

      // Format tasks
      const formattedTasks = userStoryTasks.map((task) => {
        // Determine task ID - use existing or generate new one
        const taskId = existingPmoMap.tasks[task.pmoId]
          ? existingPmoMap.tasks[task.pmoId].specifaiId
          : `TASK${nextTaskId++}`;

        return {
          id: taskId,
          list: task.title,
          acceptance: task.description || '',
          status: 'Active',
          pmoId: task.pmoId, // Store ADO ID for future reference
        };
      });

      // Return the feature object (user story)
      return {
        id: userStoryId,
        name: userStory.title,
        description: userStory.description || '',
        pmoId: userStory.pmoId, // Store ADO ID for future reference
        tasks: formattedTasks,
      };
    });
  }

  /**
   * Create or update a work item in Azure DevOps
   * @param ticket The ticket to push
   * @param parentAdoId The ADO ID of the parent work item, if any
   * @returns The ADO work item ID
   */
  private async createOrUpdateWorkItem(
    ticket: Ticket,
    parentAdoId?: number,
  ): Promise<number> {
    if (!this.baseUrl || !this.config) {
      throw new Error('Azure DevOps service not configured');
    }
    const workItemType =
      ticket.pmoIssueType ||
      (ticket.specifaiType === 'PRD'
        ? this.config.workItemTypeMapping?.PRD || 'Feature'
        : ticket.specifaiType === 'User Story'
          ? this.config.workItemTypeMapping?.US || 'Platform Feature'
          : ticket.specifaiType === 'Task'
            ? this.config.workItemTypeMapping?.TASK || 'User Story'
            : 'Task');
    const patchBody: any[] = [
      { op: 'add', path: '/fields/System.Title', value: ticket.title },
      {
        op: 'add',
        path: '/fields/System.Description',
        value: ticket.description || '',
      },
      { op: 'add', path: '/fields/System.State', value: 'Active' },
      { op: 'add', path: '/fields/System.WorkItemType', value: workItemType },
    ];
    if (parentAdoId) {
      patchBody.push({
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'System.LinkTypes.Hierarchy-Reverse',
          url: `${this.baseUrl}/_apis/wit/workItems/${parentAdoId}`,
        },
      });
    }
    const options = {
      ...this.getRequestOptions(),
      headers: (this.getRequestOptions().headers as HttpHeaders).set(
        'Content-Type',
        'application/json-patch+json',
      ),
    };
    try {
      if (ticket.pmoId) {
        const url = `${this.baseUrl}/_apis/wit/workitems/${ticket.pmoId}?api-version=${ADO_API_VERSION}`;
        const proxyUrl = this.getCorsProxyUrl(url);
        const response = await lastValueFrom(
          this.http.patch<any>(proxyUrl, patchBody, options),
        );
        return response.id;
      } else {
        const url = `${this.baseUrl}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=${ADO_API_VERSION}`;
        const proxyUrl = this.getCorsProxyUrl(url);
        const response = await lastValueFrom(
          this.http.post<any>(proxyUrl, patchBody, options),
        );
        return response.id;
      }
    } catch (error) {
      console.error('Error creating/updating work item in ADO:', error);
      throw error;
    }
  }

  /**
   * Update local files with new ADO IDs (pmoId)
   * @param selectedItems The selected PRDs, User Stories, and Tasks
   * @param appInfo The application info/metadata
   */
  private updateLocalFilesWithAdoIds(
    selectedItems: {
      prds: Ticket[];
      userStories: Ticket[];
      tasks: Ticket[];
    },
    appInfo: IProjectMetadata,
  ): void {
    const updates: { path: string; content: any }[] = [];

    // Prepare PRD base file updates
    selectedItems.prds.forEach((prd) => {
      const prdId = prd.specifaiId;
      const baseFilePath = `prd/${prdId}-base.json`;
      updates.push({
        path: baseFilePath,
        content: { ...prd, specifaiId: prdId },
      });
    });

    // Prepare PRD feature file updates (user stories and tasks)
    // Group user stories and tasks by PRD
    const userStoriesByPrd: { [prdId: string]: Ticket[] } = {};
    selectedItems.userStories.forEach((us) => {
      const prdId = us.specifaiParentId;
      if (!prdId) return;
      if (!userStoriesByPrd[prdId]) userStoriesByPrd[prdId] = [];
      userStoriesByPrd[prdId].push(us);
    });

    const tasksByUserStory: { [usId: string]: Ticket[] } = {};
    selectedItems.tasks.forEach((task) => {
      const usId = task.specifaiParentId;
      if (!usId) return;
      if (!tasksByUserStory[usId]) tasksByUserStory[usId] = [];
      tasksByUserStory[usId].push(task);
    });

    Object.keys(userStoriesByPrd).forEach((prdId) => {
      const featureFilePath = `prd/${prdId}-feature.json`;
      // Build features array
      const features = userStoriesByPrd[prdId].map((feature) => {
        const tasks = (tasksByUserStory[feature.specifaiId] || []).map(
          (task) => ({
            id: task.specifaiId,
            list: task.title,
            acceptance: task.description || '',
            status: 'Active',
            pmoId: task.pmoId,
          }),
        );
        return {
          id: feature.specifaiId,
          name: feature.title,
          description: feature.description || '',
          pmoId: feature.pmoId,
          tasks,
        };
      });
      updates.push({ path: featureFilePath, content: { features } });
    });

    this.store
      .dispatch(new BulkUpdateFiles(updates))
      .pipe(first())
      .subscribe(() => {
        this.toast.showSuccess('Successfully pushed selected items to ADO');
        const projectId = appInfo?.id;
        if (projectId) {
          this.store.dispatch(new GetProjectFiles(projectId));
        }
      });
  }
}
