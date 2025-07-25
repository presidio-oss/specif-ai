import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { ToasterService } from '../toaster/toaster.service';
import { Router } from '@angular/router';
import { ProjectsState } from '../../store/projects/projects.state';
import { 
  BulkReadFiles, 
  ReadFile, 
  BulkUpdateFiles, 
  GetProjectFiles, 
  UpdateMetadata 
} from '../../store/projects/projects.actions';
import { Ticket } from './pmo-integration.service';
import { IProjectMetadata } from '../../model/interfaces/projects.interface';
import { lastValueFrom, first } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export abstract class BasePmoService {
  constructor(
    protected store: Store,
    protected toast: ToasterService,
    protected router: Router,
  ) {}

  /**
   * Get current document hierarchy from SpecifAI for pushing to PMO
   * @param folderName The folder name (PRD, User Story, etc.)
   * @returns Promise with the document hierarchy
   */
  async getCurrentDocumentHierarchy(folderName: string): Promise<Ticket[]> {
    try {
      await lastValueFrom(
        this.store.dispatch(new BulkReadFiles('PRD')).pipe(first()),
      );

      const prds = await lastValueFrom(
        this.store.select(ProjectsState.getSelectedFileContents).pipe(first()),
      );

      console.log('Current PRDs for PMO:', prds);

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
            this.getIssueType('PRD'),
          pmoParentId: null,
          specifaiId: prdId,
          reqId: prdId,
          specifaiType: 'PRD',
          specifaiParentId: null,
          title: prdContent.title || 'Untitled PRD',
          description: prdContent.requirement || '',
          isUpdate: !!(prdContent as any).pmoId,
          child: [],
        };

        console.log(`Processing PRD for PMO: `, prdTicket);

        // Get user stories for this PRD
        const userStories = await this.getUserStoriesForPrd(prdId);
        prdTicket.child = userStories;

        prdTickets.push(prdTicket);
      }

      return prdTickets;
    } catch (error) {
      console.error('Error getting current document hierarchy for PMO:', error);
      return [];
    }
  }

  /**
   * Get user stories for a specific PRD
   * @param prdId The PRD ID
   * @returns Promise with user stories as Tickets
   */
  protected async getUserStoriesForPrd(prdId: string): Promise<Ticket[]> {
    try {
      // Read the feature file for this PRD
      const featureFilePath = `prd/${prdId}-feature.json`;

      await lastValueFrom(
        this.store.dispatch(new ReadFile(featureFilePath)).pipe(first()),
      );

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
            this.getIssueType('User Story'),
          pmoParentId: null, // Will be set by PMO when creating
          specifaiId: feature.id,
          reqId: feature.id,
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
                this.getIssueType('Task'),
              pmoParentId: null, // Will be set by PMO when creating
              specifaiId: task.id,
              reqId: task.id,
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
   * @param selectedItems Selected tickets from PMO
   * @returns Array of ticket groups, each containing a PRD and its related user stories and tasks
   */
  protected groupTicketsByParentRelationship(selectedItems: {
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
   * Get existing PRD files and analyze them to find max PRD number and existing pmoIds
   * @returns Promise with information about existing PRD files
   */
  protected async getExistingPrdFiles(appInfo: any): Promise<{
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
              const featureFiles = prdDir.children
                .filter((file) => !file.includes('-archived'))
                .map((file) => file.replace('-base.json', '-feature.json'));

              // Get all base files (PRD*-base.json)
              const baseFiles = prdDir.children.filter(
                (file) =>
                  file.includes('-base.json') && !file.includes('-archived'),
              );

              // Find max PRD number - use the regex to match PRD with any number format
              let maxPrdNumber = 0;
              const prdRegex = /PRD(\d+)[-]/;

              console.log('Project metadata for PRD count:', appInfo);

              // Check if we have project metadata with PRD count
              if (appInfo && appInfo.PRD?.count) {
                maxPrdNumber = appInfo.PRD.count;
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
  protected updatePrdCountInMetadata(newPrdCount: number, appInfo: any): void {
    if (appInfo) {
      const currentCount = appInfo.PRD?.count || 0;
      if (newPrdCount > currentCount) {
        this.store.dispatch(
          new UpdateMetadata(appInfo.id, {
            PRD: {
              ...appInfo.PRD,
              count: newPrdCount,
            },
          }),
        );
      }
    }
  }

  /**
   * Navigate to PMO configuration page
   */
  navigateToPmoConfiguration(appInfo: any, pmoType: string): void {
    // Create the state object to pass with navigation
    const navState = {
      data: appInfo,
      selectedFolder: {
        title: 'app-integrations',
        id: appInfo?.id,
        metadata: appInfo,
      },
      selectedIntegration: pmoType,
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
   * Update local files with PMO IDs for both base and feature files
   * @param selectedItems The selected PRDs, User Stories, and Tasks
   * @param appInfo The application info/metadata
   */
  protected async updateLocalFilesWithPmoIds(
    selectedItems: {
      prds: Ticket[];
      userStories: Ticket[];
      tasks: Ticket[];
    },
    appInfo: IProjectMetadata,
    successMessage: string,
  ): Promise<void> {
    const updates: { path: string; content: any }[] = [];

    // Process PRD base files
    for (const prd of selectedItems.prds) {
      const prdId = prd.specifaiId;
      const baseFilePath = `prd/${prdId}-base.json`;

      try {
        await lastValueFrom(
          this.store.dispatch(new ReadFile(baseFilePath)).pipe(first()),
        );
        const existingContent = await lastValueFrom(
          this.store.select(ProjectsState.getSelectedFileContent).pipe(first()),
        );

        if (existingContent) {
          const updatedContent = {
            ...existingContent,
            pmoId: prd.pmoId,
            pmoIssueType: prd.pmoIssueType,
            updatedAt: new Date().toISOString(),
          };

          updates.push({
            path: baseFilePath,
            content: updatedContent,
          });
        }
      } catch (error) {
        console.error(`Error reading PRD base file ${baseFilePath}:`, error);
        continue;
      }
    }

    // Process PRD feature files to update User Stories and Tasks
    const processedPrdIds = new Set<string>();

    for (const us of selectedItems.userStories) {
      const prdId = us.specifaiParentId;
      if (!prdId || processedPrdIds.has(prdId)) continue;

      processedPrdIds.add(prdId);
      const featureFilePath = `prd/${prdId}-feature.json`;

      try {
        // Read the existing PRD feature file
        await lastValueFrom(
          this.store.dispatch(new ReadFile(featureFilePath)).pipe(first()),
        );
        const existingFeatureContent = await lastValueFrom(
          this.store.select(ProjectsState.getSelectedFileContent).pipe(first()),
        );

        if (existingFeatureContent && existingFeatureContent.features) {
          // Create maps for User Story and Task updates
          const userStoryUpdates = new Map<string, Ticket>();
          selectedItems.userStories
            .filter((us: Ticket) => us.specifaiParentId === prdId)
            .forEach((us: Ticket) => userStoryUpdates.set(us.specifaiId, us));

          const taskUpdates = new Map<string, Ticket>();
          selectedItems.tasks.forEach((task: Ticket) => {
            const parentUs = selectedItems.userStories.find(
              (us: Ticket) => us.specifaiId === task.specifaiParentId,
            );
            if (parentUs && parentUs.specifaiParentId === prdId) {
              taskUpdates.set(task.specifaiId, task);
            }
          });

          // Update the features array
          const updatedFeatures = existingFeatureContent.features.map(
            (feature: any) => {
              const userStoryUpdate = userStoryUpdates.get(feature.id);

              let updatedFeature = { ...feature };

              // Update user story pmoId if this feature was pushed
              if (userStoryUpdate) {
                updatedFeature.pmoId = userStoryUpdate.pmoId;
                updatedFeature.pmoIssueType = userStoryUpdate.pmoIssueType;
              }

              // Update task pmoIds if tasks were pushed
              if (feature.tasks && Array.isArray(feature.tasks)) {
                updatedFeature.tasks = feature.tasks.map((task: any) => {
                  const taskUpdate = taskUpdates.get(task.id);
                  if (taskUpdate) {
                    return {
                      ...task,
                      pmoId: taskUpdate.pmoId,
                      pmoIssueType: taskUpdate.pmoIssueType,
                    };
                  }
                  return task;
                });
              }

              return updatedFeature;
            },
          );

          updates.push({
            path: featureFilePath,
            content: {
              ...existingFeatureContent,
              features: updatedFeatures,
            },
          });
        }
      } catch (error) {
        console.error(
          `Error reading PRD feature file ${featureFilePath}:`,
          error,
        );
        continue;
      }
    }

    if (updates.length > 0) {
      this.store
        .dispatch(new BulkUpdateFiles(updates))
        .pipe(first())
        .subscribe(() => {
          this.toast.showSuccess(successMessage);
          const projectId = appInfo?.id;
          if (projectId) {
            this.store.dispatch(new GetProjectFiles(projectId));
          }
        });
    } else {
      this.toast.showSuccess(successMessage);
    }
  }

  // Abstract methods that must be implemented by concrete services
  abstract getIssueType(specifaiType: string): string;
}
