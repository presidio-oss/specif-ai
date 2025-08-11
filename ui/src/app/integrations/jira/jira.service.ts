import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError, from, lastValueFrom } from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  mergeMap,
  concatMap,
  toArray,
  take,
} from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { JIRA_TOAST } from '../../constants/toast.constant';
import { ToasterService } from '../../services/toaster/toaster.service';
import { environment } from '../../../environments/environment';
import {
  compareADFContent,
  convertADFToMarkdown,
  convertMarkdownToADF,
} from 'src/app/utils/adf.utils';
import { PmoService } from '../../services/pmo-integration/pmo-service.interface';
import { Ticket } from '../../services/pmo-integration/pmo-integration.service';
import { ProjectsState } from '../../store/projects/projects.state';
import {
  BulkUpdateFiles,
  GetProjectFiles,
  UpdateMetadata,
} from '../../store/projects/projects.actions';
import {
  IProjectMetadata,
  JiraIntegrationConfig,
  JiraCredentials,
} from '../../model/interfaces/projects.interface';
import { getJiraTokenInfo } from './jira.utils';
import { Router } from '@angular/router';
import { BasePmoService } from '../../services/pmo-integration/base-pmo.service';
import { IntegrationCredentialsService } from '../../services/integration-credentials/integration-credentials.service';

@Injectable({
  providedIn: 'root',
})
export class JiraService extends BasePmoService implements PmoService {
  private config: JiraIntegrationConfig | null = null;
  private baseUrl: string | null = null;

  constructor(
    private http: HttpClient,
    private integrationCredService: IntegrationCredentialsService,
    toast: ToasterService,
    store: Store,
    router: Router,
  ) {
    super(store, toast, router);
  }

  /**
   * Implementation of abstract method from BasePmoService
   */
  getIssueType(specifaiType: string): string {
    return this.getJiraIssueType(specifaiType);
  }

  /**
   * Configure the Jira service with credentials and connection details
   */
  async configure(): Promise<void> {
    const metadata = await lastValueFrom(
      this.store.select(ProjectsState.getMetadata).pipe(take(1)),
    );

    const jiraCredentials =
      await this.integrationCredService.getCredentials<JiraCredentials>(
        metadata?.name,
        metadata?.id,
        'jira',
      );

    if (
      !jiraCredentials?.jiraProjectKey ||
      !jiraCredentials?.clientId ||
      !jiraCredentials?.clientSecret ||
      !jiraCredentials?.redirectUrl
    ) {
      throw new Error(
        'Jira credentials not configured. Please configure the integration first.',
      );
    }

    this.config = {
      jiraProjectKey: jiraCredentials.jiraProjectKey,
      clientId: jiraCredentials.clientId,
      clientSecret: jiraCredentials.clientSecret,
      redirectUrl: jiraCredentials.redirectUrl,
      workItemTypeMapping: metadata?.integration?.jira?.workItemTypeMapping,
    };

    // Get Jira URL from token info
    const tokenInfo = getJiraTokenInfo(metadata.id);
    this.baseUrl = tokenInfo.jiraURL;

    if (!this.baseUrl) {
      throw new Error('Jira URL not found. Please reconnect to Jira.');
    }
  }

  /**
   * Validate Jira credentials and connection
   */
  async validateCredentials(): Promise<{
    isValid: boolean;
    errorMessage?: string;
  }> {
    try {
      if (!this.config) {
        throw new Error('Jira service not configured. Call configure() first.');
      }

      const metadata = await lastValueFrom(
        this.store.select(ProjectsState.getMetadata).pipe(take(1)),
      );
      const tokenInfo = getJiraTokenInfo(metadata.id);

      const isValid =
        tokenInfo.projectKey === this.config.jiraProjectKey &&
        !!tokenInfo.token &&
        this.isTokenValid(tokenInfo);

      return {
        isValid,
        errorMessage: isValid
          ? undefined
          : 'Invalid or expired Jira token. Please reconnect.',
      };
    } catch (error) {
      return {
        isValid: false,
        errorMessage:
          'Failed to connect to Jira. Please check your credentials and try again.',
      };
    }
  }

  /**
   * Get work items hierarchy from Jira (Epics -> Stories -> Sub-tasks)
   */
  async getWorkPlanItemsHierarchy(
    skip: number = 0,
    top: number = 200,
  ): Promise<{ tickets: Ticket[]; totalCount: number }> {
    if (!this.config || !this.baseUrl) {
      return { tickets: [], totalCount: 0 };
    }

    try {
      const metadata = await lastValueFrom(
        this.store.select(ProjectsState.getMetadata).pipe(take(1)),
      );
      const tokenInfo = getJiraTokenInfo(metadata.id);

      if (!tokenInfo.token || !this.isTokenValid(tokenInfo)) {
        throw new Error('Invalid or expired Jira token');
      }

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

      // 2. Get epics from Jira with pagination
      const { epics, totalCount } = await this.getEpicsFromJira(
        tokenInfo.token!,
        skip,
        top,
      );
      if (epics.length === 0) {
        return { tickets: [], totalCount };
      }

      // 3. Build the hierarchy using existing mappings where available
      const hierarchy = await Promise.all(
        epics.map(async (epic: any) => {
          try {
            const epicPmoId = epic.key;
            const existingEpicMapping = existingPmoToSpecifaiMap.get(epicPmoId);

            // Use mapJiraIssueToTicket with existing mapping
            const epicTicket = await this.mapJiraIssueToTicket(
              epic,
              'PRD',
              existingEpicMapping,
            );

            // Get stories for this epic
            const stories = await this.getStoriesForEpic(
              epic.key,
              tokenInfo.token!,
            );

            epicTicket.child = await Promise.all(
              stories.map(async (story: any) => {
                try {
                  const storyPmoId = story.key;
                  const existingStoryMapping =
                    existingPmoToSpecifaiMap.get(storyPmoId);

                  // Use mapJiraIssueToTicket with existing mapping
                  const storyTicket = await this.mapJiraIssueToTicket(
                    story,
                    'User Story',
                    existingStoryMapping,
                  );
                  storyTicket.specifaiParentId = epicTicket.specifaiId;
                  storyTicket.pmoParentId = epic.key;

                  // Get sub-tasks for this story
                  const subTasks = await this.getSubTasksForStory(
                    story.key,
                    tokenInfo.token!,
                  );

                  storyTicket.child = await Promise.all(
                    subTasks.map(async (subTask: any) => {
                      const subTaskPmoId = subTask.key;
                      const existingSubTaskMapping =
                        existingPmoToSpecifaiMap.get(subTaskPmoId);

                      // Use mapJiraIssueToTicket with existing mapping
                      const taskTicket = await this.mapJiraIssueToTicket(
                        subTask,
                        'Task',
                        existingSubTaskMapping,
                      );
                      taskTicket.specifaiParentId = storyTicket.specifaiId;
                      taskTicket.pmoParentId = story.key;
                      return taskTicket;
                    }),
                  );

                  return storyTicket;
                } catch (error) {
                  const storyPmoId = story.key;
                  const existingStoryMapping =
                    existingPmoToSpecifaiMap.get(storyPmoId);

                  const storyTicket = await this.mapJiraIssueToTicket(
                    story,
                    'User Story',
                    existingStoryMapping,
                  );
                  storyTicket.specifaiParentId = epicTicket.specifaiId;
                  storyTicket.pmoParentId = epic.key;
                  storyTicket.child = [];
                  return storyTicket;
                }
              }),
            );

            return epicTicket;
          } catch (error) {
            const epicPmoId = epic.key;
            const existingEpicMapping = existingPmoToSpecifaiMap.get(epicPmoId);

            const epicTicket = await this.mapJiraIssueToTicket(
              epic,
              'PRD',
              existingEpicMapping,
            );
            epicTicket.child = [];
            return epicTicket;
          }
        }),
      );

      return { tickets: hierarchy, totalCount };
    } catch (err) {
      return { tickets: [], totalCount: 0 };
    }
  }

  // getCurrentDocumentHierarchy and getUserStoriesForPrd are now inherited from BasePmoService

  /**
   * Get Jira issue type based on SpecifAI type and mapping configuration
   */
  private getJiraIssueType(specifaiType: string): string {
    const mapping = this.config?.workItemTypeMapping;

    switch (specifaiType) {
      case 'PRD':
        return mapping?.['PRD'] || 'Epic';
      case 'User Story':
        return mapping?.['US'] || 'Story';
      case 'Task':
        return mapping?.['TASK'] || 'Sub-task';
      default:
        return 'Task';
    }
  }

  /**
   * Check if Jira token is valid
   */
  private isTokenValid(tokenInfo: any): boolean {
    return (
      !!tokenInfo.token &&
      !!tokenInfo.tokenExpiration &&
      new Date() < new Date(tokenInfo.tokenExpiration)
    );
  }

  /**
   * Get epics from Jira project
   */
  private async getEpicsFromJira(
    token: string,
    skip: number,
    top: number,
  ): Promise<{ epics: any[]; totalCount: number }> {
    if (!this.baseUrl) {
      throw new Error('Jira base URL not configured');
    }

    const epicIssueType = this.getJiraIssueType('PRD');
    const jql = `project = "${this.config!.jiraProjectKey}" AND issuetype = "${epicIssueType}" ORDER BY created DESC`;

    const searchUrl = `${this.baseUrl}/rest/api/3/search`;
    const params = {
      jql,
      startAt: skip,
      maxResults: top,
      fields: [
        'summary',
        'description',
        'status',
        'issuetype',
        'created',
        'updated',
      ],
    };

    try {
      const response = await lastValueFrom(
        this.http.post<any>(searchUrl, params, {
          headers: this.getHeaders(token),
        }),
      );

      return {
        epics: response.issues || [],
        totalCount: response.total || 0,
      };
    } catch (error) {
      return { epics: [], totalCount: 0 };
    }
  }

  /**
   * Get stories for a specific epic
   */
  private async getStoriesForEpic(
    epicKey: string,
    token: string,
  ): Promise<any[]> {
    if (!this.baseUrl) {
      throw new Error('Jira base URL not configured');
    }

    const storyIssueType = this.getJiraIssueType('User Story');
    const jql = `project = "${this.config!.jiraProjectKey}" AND issuetype = "${storyIssueType}" AND parent = "${epicKey}" ORDER BY created DESC`;

    const searchUrl = `${this.baseUrl}/rest/api/3/search`;
    const params = {
      jql,
      fields: [
        'summary',
        'description',
        'status',
        'issuetype',
        'parent',
        'created',
        'updated',
      ],
    };

    try {
      const response = await lastValueFrom(
        this.http.post<any>(searchUrl, params, {
          headers: this.getHeaders(token),
        }),
      );

      return response.issues || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get sub-tasks for a specific story
   */
  private async getSubTasksForStory(
    storyKey: string,
    token: string,
  ): Promise<any[]> {
    if (!this.baseUrl) {
      throw new Error('Jira base URL not configured');
    }

    const taskIssueType = this.getJiraIssueType('Task');
    const jql = `project = "${this.config!.jiraProjectKey}" AND issuetype = "${taskIssueType}" AND parent = "${storyKey}" ORDER BY created DESC`;

    const searchUrl = `${this.baseUrl}/rest/api/3/search`;
    const params = {
      jql,
      fields: [
        'summary',
        'description',
        'status',
        'issuetype',
        'parent',
        'created',
        'updated',
      ],
    };

    try {
      const response = await lastValueFrom(
        this.http.post<any>(searchUrl, params, {
          headers: this.getHeaders(token),
        }),
      );

      return response.issues || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Map Jira issue to Ticket interface with mapping logic
   * @param jiraIssue The Jira issue object
   * @param specifaiType The SpecifAI type (PRD, User Story, Task)
   * @param existingMapping Optional existing mapping information from SpecifAI
   */
  private async mapJiraIssueToTicket(
    jiraIssue: any,
    specifaiType: string,
    existingMapping?: {
      specifaiId: string;
      specifaiType: string;
      specifaiParentId: string | null;
    },
  ): Promise<Ticket> {
    let description = '';

    if (jiraIssue.fields.description) {
      try {
        description = await lastValueFrom(
          convertADFToMarkdown(jiraIssue.fields.description),
        );
      } catch (error) {
        description =
          jiraIssue.fields.description?.content?.[0]?.content?.[0]?.text || '';
      }
    }

    // Determine if this is an update based on existing mapping
    const isUpdate = !!existingMapping;

    // Use existing SpecifAI ID if available, otherwise generate new one
    const specifaiId = existingMapping
      ? existingMapping.specifaiId
      : `${specifaiType.toUpperCase().replace(' ', '')}${jiraIssue.id}`;

    // Set reqId based on existing mapping
    const reqId = existingMapping
      ? existingMapping.specifaiId
      : `New ${specifaiType}`;

    return {
      pmoId: jiraIssue.key,
      pmoIssueType: jiraIssue.fields.issuetype.name,
      pmoParentId: jiraIssue.fields.parent?.key || null,
      specifaiId: specifaiId,
      reqId: reqId,
      specifaiType: specifaiType,
      specifaiParentId: existingMapping?.specifaiParentId || null,
      title: jiraIssue.fields.summary,
      description: description,
      child: [],
      isUpdate: isUpdate,
    };
  }

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      skipLoader: 'true',
    });
  }

  private createEpic(
    payload: any,
    token: string,
    adfContent: any,
  ): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue`;
    const issueData = {
      fields: {
        project: { key: payload.projectKey },
        summary: payload.epicName,
        description: { ...adfContent, version: 1 },
        issuetype: { name: 'Epic' },
      },
    };

    return this.http
      .post(issueUrl, issueData, {
        headers: this.getHeaders(token),
      })
      .pipe(
        map((epic: any) => epic),
        catchError(this.handleError),
      );
  }

  private updateEpic(
    payload: any,
    token: string,
    adfContent: any,
  ): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${payload.pmoId}?returnIssue=true`;
    const updateData = {
      fields: {
        summary: payload.epicName,
        description: { ...adfContent, version: 1 },
      },
    };

    return this.http
      .put(issueUrl, updateData, {
        headers: this.getHeaders(token),
      })
      .pipe(
        map((updated: any) => updated),
        catchError(this.handleError),
      );
  }

  createOrUpdateEpic(payload: any, token: string): Observable<any> {
    if (payload.pmoId) {
      const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${payload.pmoId}`;
      return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
        switchMap((issue: any) => {
          return convertMarkdownToADF(payload.epicDescription).pipe(
            switchMap((newADF) => {
              const existingADF = issue.fields.description || {};
              if (
                issue.fields.summary !== payload.epicName ||
                !compareADFContent(existingADF, newADF)
              ) {
                return this.updateEpic(payload, token, newADF);
              }
              return of(issue);
            }),
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return convertMarkdownToADF(payload.epicDescription).pipe(
              switchMap((adfContent) =>
                this.createEpic(payload, token, adfContent),
              ),
            );
          } else {
            return throwError(() => error);
          }
        }),
      );
    } else {
      return convertMarkdownToADF(payload.epicDescription).pipe(
        switchMap((adfContent) => this.createEpic(payload, token, adfContent)),
      );
    }
  }

  createOrUpdateStory(
    payload: any,
    feature: any,
    token: string,
  ): Observable<any> {
    if (feature.pmoId) {
      const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${feature.pmoId}`;
      return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
        switchMap((issue: any) => {
          return convertMarkdownToADF(feature.description).pipe(
            switchMap((newADF) => {
              const existingADF = issue.fields.description || {};
              if (
                issue.fields.summary !== feature.name ||
                !compareADFContent(existingADF, newADF)
              ) {
                return this.updateStory(payload, feature, token, newADF);
              }
              return of(issue);
            }),
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return convertMarkdownToADF(feature.description).pipe(
              switchMap((adfContent) =>
                this.createStory(payload, feature, token, adfContent),
              ),
            );
          } else {
            return throwError(error);
          }
        }),
      );
    } else {
      return convertMarkdownToADF(feature.description).pipe(
        switchMap((adfContent) =>
          this.createStory(payload, feature, token, adfContent),
        ),
      );
    }
  }

  private createStory(
    payload: any,
    feature: any,
    token: string,
    adfContent: any,
  ): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue`;
    const issueData = {
      fields: {
        project: { key: payload.projectKey },
        summary: feature.name,
        description: { ...adfContent, version: 1 },
        issuetype: { name: 'Story' },
        parent: { key: payload.pmoId },
      },
    };

    return this.http
      .post(issueUrl, issueData, {
        headers: this.getHeaders(token),
      })
      .pipe(
        map((story: any) => story),
        catchError(this.handleError),
      );
  }

  private updateStory(
    payload: any,
    feature: any,
    token: string,
    adfContent: any,
  ): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${feature.pmoId}?returnIssue=true`;
    const updatedData = {
      fields: {
        summary: feature.name,
        description: { ...adfContent, version: 1 },
      },
    };

    return this.http
      .put(issueUrl, updatedData, {
        headers: this.getHeaders(token),
      })
      .pipe(
        map((updated: any) => updated),
        catchError(this.handleError),
      );
  }

  createOrUpdateSubTask(
    payload: any,
    storyKey: string,
    task: any,
    token: string,
  ): Observable<any> {
    if (task.pmoId) {
      const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${task.pmoId}`;
      return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
        switchMap((issue: any) => {
          return convertMarkdownToADF(task.acceptance).pipe(
            switchMap((newADF) => {
              const existingADF = issue.fields.description || {};
              if (
                issue.fields.summary !== task.list ||
                !compareADFContent(existingADF, newADF)
              ) {
                return this.updateSubTask(payload, task, token, newADF);
              }
              return of(issue);
            }),
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return convertMarkdownToADF(task.acceptance).pipe(
              switchMap((adfContent) =>
                this.createSubTask(payload, storyKey, task, token, adfContent),
              ),
            );
          } else {
            return throwError(error);
          }
        }),
      );
    } else {
      return convertMarkdownToADF(task.acceptance).pipe(
        switchMap((adfContent) =>
          this.createSubTask(payload, storyKey, task, token, adfContent),
        ),
      );
    }
  }

  private createSubTask(
    payload: any,
    storyKey: string,
    task: any,
    token: string,
    adfContent: any,
  ): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue`;
    const issueData = {
      fields: {
        project: { key: payload.projectKey },
        summary: task.list,
        description: { ...adfContent, version: 1 },
        issuetype: { name: 'Sub-task' },
        parent: { key: storyKey },
      },
    };

    return this.http
      .post(issueUrl, issueData, {
        headers: this.getHeaders(token),
      })
      .pipe(
        map((subTask: any) => subTask),
        catchError(this.handleError),
      );
  }

  private updateSubTask(
    payload: any,
    task: any,
    token: string,
    adfContent: any,
  ): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${task.pmoId}?returnIssue=true`;
    const updateData = {
      fields: {
        summary: task.list,
        description: { ...adfContent, version: 1 },
      },
    };

    return this.http
      .put(issueUrl, updateData, {
        headers: this.getHeaders(token),
      })
      .pipe(
        map((updated: any) => updated),
        catchError(this.handleError),
      );
  }

  createOrUpdateTickets(payload: any): Observable<any> {
    this.toast.showInfo(JIRA_TOAST.INFO);
    return this.createOrUpdateEpic(payload, payload.token).pipe(
      switchMap((epic: any) => {
        payload.pmoId = epic.key;

        const result = {
          epicName: payload.epicName,
          pmoId: epic.key,
          features: [] as any[],
        };

        const storyRequests = from(payload.features).pipe(
          mergeMap(
            (feature: any) =>
              this.createOrUpdateStory(payload, feature, payload.token).pipe(
                switchMap((story: any) => {
                  const storyDetails = {
                    storyName: feature.name,
                    pmoId: story.key,
                    tasks: [] as any[],
                  };

                  if (feature.tasks && feature.tasks.length > 0) {
                    const taskRequests = from(feature.tasks).pipe(
                      mergeMap(
                        (task: any) =>
                          this.createOrUpdateSubTask(
                            payload,
                            story.key,
                            task,
                            payload.token,
                          ).pipe(
                            map((subTask: any) => {
                              storyDetails.tasks.push({
                                subTaskName: task.list,
                                pmoId: subTask.key,
                              });
                            }),
                          ),
                        environment.JIRA_RATE_LIMIT_CONFIG,
                      ),
                    );

                    return taskRequests.pipe(
                      map(() => {
                        result.features.push(storyDetails);
                      }),
                    );
                  } else {
                    result.features.push(storyDetails);
                    return of(null);
                  }
                }),
              ),
            environment.JIRA_RATE_LIMIT_CONFIG,
          ),
        );

        return storyRequests.pipe(
          concatMap(() => of(null)),
          toArray(),
          map(() => result),
        );
      }),
    );
  }

  private handleError(error: any): Observable<never> {
    return throwError(() => new Error(error.message || 'Server Error'));
  }

  syncFromJira(payload: any): Observable<any> {
    this.toast.showInfo('Syncing from JIRA...');

    const syncRequests: Observable<any>[] = [];

    if (payload.pmoId) {
      syncRequests.push(this.getEpicFromJira(payload, payload.token));
    }

    payload.features.forEach((feature: any) => {
      if (feature.pmoId) {
        syncRequests.push(
          this.getStoryFromJira(payload, feature, payload.token),
        );
      }
    });

    return from(syncRequests).pipe(
      mergeMap((request) => request, environment.JIRA_RATE_LIMIT_CONFIG),
      toArray(),
      map((results: any[]) => {
        const syncResult = {
          epic: null as any,
          features: [] as any[],
        };

        results.forEach((result) => {
          if (result.type === 'epic') {
            syncResult.epic = result.data;
          } else if (result.type === 'story') {
            syncResult.features.push(result.data);
          }
        });

        return syncResult;
      }),
      catchError(this.handleError),
    );
  }

  private getEpicFromJira(payload: any, token: string): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${payload.pmoId}`;

    return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
      switchMap((epic: any) => {
        return convertADFToMarkdown(epic.fields.description).pipe(
          map((markdownDescription) => ({
            type: 'epic',
            data: {
              title: epic.fields.summary,
              requirement: markdownDescription,
              pmoId: epic.key,
              status: epic.fields.status.name,
              lastUpdated: epic.fields.updated,
            },
          })),
        );
      }),
      catchError((error) => {
        return of({ type: 'epic', data: null });
      }),
    );
  }

  private getStoryFromJira(
    payload: any,
    feature: any,
    token: string,
  ): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${feature.pmoId}`;

    return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
      switchMap((story: any) => {
        return convertADFToMarkdown(story.fields.description).pipe(
          switchMap((markdownDescription) => {
            const storyData = {
              type: 'story',
              data: {
                id: feature.id,
                name: story.fields.summary,
                description: markdownDescription,
                pmoId: story.key,
                status: story.fields.status.name,
                lastUpdated: story.fields.updated,
                tasks: [...(feature.tasks || [])],
              },
            };

            if (story.fields.subtasks && story.fields.subtasks.length > 0) {
              const subTaskRequests: Observable<any>[] =
                story.fields.subtasks.map((subtask: any) =>
                  this.getSubTaskFromJira(payload, subtask, token),
                );

              return from(subTaskRequests).pipe(
                mergeMap(
                  (request) => request,
                  environment.JIRA_RATE_LIMIT_CONFIG,
                ),
                toArray(),
                map((subTasks: any[]) => {
                  // Update existing tasks with JIRA data
                  storyData.data.tasks = storyData.data.tasks.map(
                    (existingTask: any) => {
                      const matchingSubTask = subTasks.find(
                        (st) => st && st.pmoId === existingTask.pmoId,
                      );

                      if (matchingSubTask) {
                        return {
                          ...existingTask,
                          list: matchingSubTask.summary,
                          acceptance: matchingSubTask.description,
                          status: matchingSubTask.status,
                          lastUpdated: matchingSubTask.lastUpdated,
                        };
                      }
                      return existingTask;
                    },
                  );

                  return storyData;
                }),
              );
            }

            return of(storyData);
          }),
        );
      }),
      catchError((error) => {
        return of({ type: 'story', data: null });
      }),
    );
  }

  private getSubTaskFromJira(
    payload: any,
    subtask: any,
    token: string,
  ): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${subtask.key}`;

    return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
      switchMap((task: any) => {
        return convertADFToMarkdown(task.fields.description).pipe(
          map((markdownDescription) => ({
            pmoId: task.key,
            summary: task.fields.summary,
            description: markdownDescription,
            status: task.fields.status.name,
            lastUpdated: task.fields.updated,
          })),
        );
      }),
      catchError((error) => {
        return of(null);
      }),
    );
  }

  /**
   * Process selected Jira items and create/update PRD files (similar to ADO)
   * @param folderName The folder name
   * @param action The action (pull or push)
   * @param selectedItems The items selected in the Jira integration modal
   * @param appInfo The application info/metadata
   */
  processJiraSelectedItems(
    folderName: string,
    action: 'pull' | 'push',
    selectedItems: {
      prds: Ticket[];
      userStories: Ticket[];
      tasks: Ticket[];
    },
    appInfo: any,
  ): void {
    if (action === 'pull') {
      this.toast.showInfo('Pulling items from Jira...');
      try {
        // Implementation similar to ADO pull logic
        this.pullFromJira(selectedItems, appInfo);
      } catch (error) {
        this.toast.showError('Failed to import items from Jira');
      }
    } else {
      this.toast.showInfo('Pushing items to Jira...');
      (async () => {
        try {
          // Implementation similar to ADO push logic
          await this.pushToJira(selectedItems, appInfo);
        } catch (error) {
          this.toast.showError('Failed to push items to Jira');
        }
      })();
    }
  }

  /**
   * Navigate to Jira configuration page
   */
  navigateToJiraConfiguration(appInfo: any): void {
    // Create the state object to pass with navigation
    const navState = {
      data: appInfo,
      selectedFolder: {
        title: 'app-integrations',
        id: appInfo?.id,
        metadata: appInfo,
      },
      selectedIntegration: 'jira',
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
   * Pull items from Jira and create/update SpecifAI files (same logic as ADO)
   */
  private async pullFromJira(
    selectedItems: {
      prds: Ticket[];
      userStories: Ticket[];
      tasks: Ticket[];
    },
    appInfo: any,
  ): Promise<void> {
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

          let nextPrdNumber = maxPrdNumber + 1;

          let globalNextUserStoryId = 1;
          let globalNextTaskId = 1;

          if (appInfo && appInfo.US?.count) {
            globalNextUserStoryId = appInfo.US.count + 1;
          } else {
            Object.values(existingPmoMap.userStories).forEach((item) => {
              const match = item.specifaiId.match(/US(\d+)/);
              if (match && match[1]) {
                const id = parseInt(match[1], 10);
                if (id >= globalNextUserStoryId) {
                  globalNextUserStoryId = id + 1;
                }
              }
            });
          }

          if (appInfo && appInfo.TASK?.count) {
            globalNextTaskId = appInfo.TASK.count + 1;
          } else {
            Object.values(existingPmoMap.tasks).forEach((item) => {
              const match = item.specifaiId.match(/TASK(\d+)/);
              if (match && match[1]) {
                const id = parseInt(match[1], 10);
                if (id >= globalNextTaskId) {
                  globalNextTaskId = id + 1;
                }
              }
            });
          }

          // Process each PRD (Epic from Jira)
          const processGroups = async () => {
            for (const [, group] of ticketGroups.entries()) {
              const prd = group.prd;

              // Check if this PRD already exists based on pmoId
              const existingPrd = existingPmoMap.prds[prd.pmoId];

              // Determine PRD ID - use existing or generate new one with zero-padding (PRD01, PRD02, etc.)
              const prdId = existingPrd
                ? existingPrd.specifaiId
                : `PRD${String(nextPrdNumber++).padStart(2, '0')}`;

              // Format the user stories and tasks for this PRD
              const features = await this.formatFeaturesForPrd(
                group.userStories,
                group.tasks,
                existingPmoMap,
                globalNextUserStoryId,
                globalNextTaskId,
              );

              features.forEach((feature) => {
                if (!existingPmoMap.userStories[feature.pmoId]) {
                  globalNextUserStoryId++;
                }
                feature.tasks.forEach((task: any) => {
                  if (!existingPmoMap.tasks[task.pmoId]) {
                    globalNextTaskId++;
                  }
                });
              });

              // Create the PRD base file content with correct structure
              const prdBaseContent = {
                id: prdId,
                title: prd.title,
                requirement: prd.description || '', // Jira description -> requirement mapping
                state: 'Active',
                createdAt: existingPrd
                  ? new Date().toISOString()
                  : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                pmoId: prd.pmoId, // Store Jira ID for future reference
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

                // Create maps for existing features - one by pmoId and one by feature id for manual features
                const existingFeatureByPmoId = new Map<string, any>();
                const existingFeatureById = new Map<string, any>();
                const processedFeatureIds = new Set<string>();

                existingFeatures.forEach((feature: any) => {
                  if (feature.pmoId) {
                    existingFeatureByPmoId.set(feature.pmoId, feature);
                  }
                  if (feature.id) {
                    existingFeatureById.set(feature.id, feature);
                  }
                });

                // Merge or update features
                const mergedFeatures = features.map((newFeature) => {
                  const existingFeature = existingFeatureByPmoId.get(
                    newFeature.pmoId,
                  );

                  // If this feature already exists, update its properties but preserve any
                  // that might be set in the UI and not coming from Jira
                  if (existingFeature) {
                    processedFeatureIds.add(existingFeature.id); // Track processed features

                    // Create maps for existing tasks - one by pmoId and one by task id for manual tasks
                    const existingTaskByPmoId = new Map<string, any>();
                    const existingTaskById = new Map<string, any>();
                    const processedTaskIds = new Set<string>();

                    (existingFeature.tasks || []).forEach((task: any) => {
                      if (task.pmoId) {
                        existingTaskByPmoId.set(task.pmoId, task);
                      }
                      if (task.id) {
                        existingTaskById.set(task.id, task);
                      }
                    });

                    // Merge tasks within this feature
                    const mergedTasks = (newFeature.tasks || []).map(
                      (newTask: any) => {
                        const existingTask = existingTaskByPmoId.get(
                          newTask.pmoId,
                        );

                        // If task exists, update it while preserving local changes
                        if (existingTask) {
                          processedTaskIds.add(existingTask.id); // Track processed tasks
                          return {
                            ...existingTask,
                            // Only update title if it's different and not empty
                            list:
                              newTask.list && newTask.list.trim() !== ''
                                ? newTask.list
                                : existingTask.list,
                            // Preserve local acceptance criteria if Jira doesn't have it
                            acceptance:
                              newTask.acceptance &&
                              newTask.acceptance.trim() !== ''
                                ? newTask.acceptance
                                : existingTask.acceptance,
                            // Update pmoId and pmoIssueType from Jira
                            pmoId: newTask.pmoId,
                            pmoIssueType:
                              newTask.pmoIssueType || existingTask.pmoIssueType,
                            // Keep all other existing properties (status, custom fields, etc.)
                            status: existingTask.status,
                          };
                        }

                        // This is a new task
                        return newTask;
                      },
                    );

                    // Add any remaining existing tasks that weren't processed (manual tasks without pmoId)
                    existingTaskById.forEach((remainingTask, taskId) => {
                      if (!processedTaskIds.has(taskId)) {
                        mergedTasks.push(remainingTask);
                      }
                    });

                    // Return the merged feature with better preservation of existing data
                    return {
                      ...existingFeature,
                      // Only update name if it's different and not empty
                      name:
                        newFeature.name && newFeature.name.trim() !== ''
                          ? newFeature.name
                          : existingFeature.name,
                      // Preserve local description if Jira doesn't have it or if local is more detailed
                      description:
                        newFeature.description &&
                        newFeature.description.trim() !== ''
                          ? newFeature.description
                          : existingFeature.description,
                      // Update pmoId and pmoIssueType from Jira
                      pmoId: newFeature.pmoId,
                      pmoIssueType:
                        newFeature.pmoIssueType || existingFeature.pmoIssueType,
                      tasks: mergedTasks,
                      // Preserve all other existing properties
                    };
                  }

                  // This is a new feature
                  return newFeature;
                });

                // Add any remaining existing features that weren't processed (manual features without pmoId)
                existingFeatureById.forEach((remainingFeature, featureId) => {
                  if (!processedFeatureIds.has(featureId)) {
                    mergedFeatures.push(remainingFeature);
                  }
                });

                // Update the feature content with merged features
                prdFeatureContent = {
                  ...existingFeatureFile,
                  features: mergedFeatures,
                };
              }

              // Add PRD files to updates
              updates.push({
                path: `prd/${prdId}-base.json`,
                content: prdBaseContent,
              });

              updates.push({
                path: featureFilePath,
                content: prdFeatureContent,
              });
            }

            // If we have updates, dispatch the BulkUpdateFiles action
            if (updates.length > 0) {
              // Calculate the new max PRD number after adding all new PRDs
              const newMaxPrdNumber =
                maxPrdNumber +
                ticketGroups.filter((group) => {
                  const prd = group.prd;
                  return !existingPmoMap.prds[prd.pmoId]; // Only count new PRDs
                }).length;

              this.store.dispatch(new BulkUpdateFiles(updates));
              this.toast.showSuccess(
                `Successfully imported ${ticketGroups.length} PRDs with their user stories and tasks from Jira`,
              );

              // Refresh the file list
              const projectId = appInfo?.id;
              if (projectId) {
                this.store.dispatch(new GetProjectFiles(projectId));
              }

              setTimeout(() => {
                this.updateCountsInMetadata(
                  newMaxPrdNumber,
                  ticketGroups,
                  existingPmoMap,
                  appInfo,
                );
              }, 100);
            } else {
              this.toast.showInfo('No items to import from Jira');
            }
          };

          // Execute the async processing
          processGroups().catch((error) => {
            this.toast.showError('Failed to process Jira items');
          });
        })
        .catch((error) => {
          this.toast.showError('Failed to process Jira items');
        });
    } catch (error) {
      this.toast.showError('Failed to import items from Jira');
    }
  }

  /**
   * Push items to Jira and update local files with Jira IDs
   */
  private async pushToJira(
    selectedItems: {
      prds: Ticket[];
      userStories: Ticket[];
      tasks: Ticket[];
    },
    appInfo: IProjectMetadata,
  ): Promise<void> {
    try {
      const metadata = await lastValueFrom(
        this.store.select(ProjectsState.getMetadata).pipe(take(1)),
      );
      const tokenInfo = getJiraTokenInfo(metadata.id);

      if (!tokenInfo.token || !this.isTokenValid(tokenInfo)) {
        throw new Error('Invalid or expired Jira token');
      }

      // Map to keep track of PRD/UserStory/Task pmoId <-> Jira ID
      const prdJiraIdMap: { [specifaiId: string]: string } = {};
      const userStoryJiraIdMap: { [specifaiId: string]: string } = {};
      const taskJiraIdMap: { [specifaiId: string]: string } = {};

      // 1. Push PRDs (Epics)
      for (const prd of selectedItems.prds) {
        const jiraKey = await this.createOrUpdateJiraIssue(
          prd,
          undefined,
          tokenInfo.token!,
        );
        prdJiraIdMap[prd.specifaiId] = jiraKey;
        prd.pmoId = jiraKey;
      }

      // 2. Push User Stories (Stories)
      for (const us of selectedItems.userStories) {
        // Find parent PRD's Jira ID
        const parentSpecifaiId = us.specifaiParentId;
        const parentJiraKey = parentSpecifaiId
          ? prdJiraIdMap[parentSpecifaiId]
          : undefined;
        const jiraKey = await this.createOrUpdateJiraIssue(
          us,
          parentJiraKey,
          tokenInfo.token!,
        );
        userStoryJiraIdMap[us.specifaiId] = jiraKey;
        us.pmoId = jiraKey;
      }

      // 3. Push Tasks (Sub-tasks)
      for (const task of selectedItems.tasks) {
        // Find parent User Story's Jira ID
        const parentSpecifaiId = task.specifaiParentId;
        const parentJiraKey = parentSpecifaiId
          ? userStoryJiraIdMap[parentSpecifaiId]
          : undefined;
        const jiraKey = await this.createOrUpdateJiraIssue(
          task,
          parentJiraKey,
          tokenInfo.token!,
        );
        taskJiraIdMap[task.specifaiId] = jiraKey;
        task.pmoId = jiraKey;
      }

      await this.updateLocalFilesWithPmoIds(
        selectedItems,
        appInfo,
        'Successfully pushed selected items to Jira',
      );
    } catch (error) {
      this.toast.showError('Failed to push items to Jira');
    }
  }

  /**
   * Create or update a Jira issue
   */
  private async createOrUpdateJiraIssue(
    ticket: Ticket,
    parentJiraKey?: string,
    token?: string,
  ): Promise<string> {
    if (!this.baseUrl || !this.config) {
      throw new Error('Jira service not configured');
    }

    const issueType = this.getJiraIssueType(ticket.specifaiType);

    const issueData: any = {
      fields: {
        project: { key: this.config.jiraProjectKey },
        summary: ticket.title,
        description: await lastValueFrom(
          convertMarkdownToADF(ticket.description || ''),
        ),
        issuetype: { name: issueType },
      },
    };

    // Add parent relationship if provided
    if (parentJiraKey && ticket.specifaiType !== 'PRD') {
      issueData.fields.parent = { key: parentJiraKey };
    }

    try {
      if (ticket.pmoId) {
        // Update existing issue
        const updateUrl = `${this.baseUrl}/rest/api/3/issue/${ticket.pmoId}`;
        await lastValueFrom(
          this.http.put(
            updateUrl,
            { fields: issueData.fields },
            {
              headers: this.getHeaders(token!),
            },
          ),
        );
        return ticket.pmoId;
      } else {
        // Create new issue
        const createUrl = `${this.baseUrl}/rest/api/3/issue`;
        const response = await lastValueFrom(
          this.http.post<any>(createUrl, issueData, {
            headers: this.getHeaders(token!),
          }),
        );
        return response.key;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update the PRD, US and TASK counts in the project metadata
   * @param newPrdCount The new PRD count
   * @param ticketGroups The processed ticket groups
   * @param existingPmoMap Map of existing items
   * @param appInfo The project metadata
   */
  private updateCountsInMetadata(
    newPrdCount: number,
    ticketGroups: Array<{
      prd: Ticket;
      userStories: Ticket[];
      tasks: { [userStoryId: string]: Ticket[] };
    }>,
    existingPmoMap: any,
    appInfo: any,
  ): void {
    if (!appInfo) return;

    let newUsCount = appInfo.US?.count || 0;
    ticketGroups.forEach((group) => {
      group.userStories.forEach((us) => {
        if (!existingPmoMap.userStories[us.pmoId]) {
          newUsCount++;
        }
      });
    });

    let newTaskCount = appInfo.TASK?.count || 0;
    ticketGroups.forEach((group) => {
      Object.values(group.tasks).forEach((taskArray) => {
        taskArray.forEach((task) => {
          if (!existingPmoMap.tasks[task.pmoId]) {
            newTaskCount++;
          }
        });
      });
    });

    const currentPrdCount = appInfo.PRD?.count || 0;
    const currentUsCount = appInfo.US?.count || 0;
    const currentTaskCount = appInfo.TASK?.count || 0;

    if (
      newPrdCount > currentPrdCount ||
      newUsCount > currentUsCount ||
      newTaskCount > currentTaskCount
    ) {
      this.store.dispatch(
        new UpdateMetadata(appInfo.id, {
          ...appInfo,
          PRD: {
            ...appInfo.PRD,
            count: Math.max(newPrdCount, currentPrdCount),
          },
          US: {
            ...appInfo.US,
            count: Math.max(newUsCount, currentUsCount),
          },
          TASK: {
            ...appInfo.TASK,
            count: Math.max(newTaskCount, currentTaskCount),
          },
        }),
      );
    }
  }

  /**
   * Format user stories and tasks into the features format required for PRD feature files
   * @param userStories User stories to include in the PRD
   * @param tasks Tasks mapped by user story ID
   * @param existingPmoMap Map of existing items with pmoId
   * @param nextUserStoryId Global counter for user story IDs
   * @param nextTaskId Global counter for task IDs
   * @returns Array of formatted features
   */
  private async formatFeaturesForPrd(
    userStories: Ticket[],
    tasks: { [userStoryId: string]: Ticket[] },
    existingPmoMap: {
      prds: { [pmoId: string]: { specifaiId: string; path: string } };
      userStories: { [pmoId: string]: { specifaiId: string; path: string } };
      tasks: { [pmoId: string]: { specifaiId: string; path: string } };
    },
    nextUserStoryId: number,
    nextTaskId: number,
  ): Promise<Array<any>> {
    let currentUserStoryId = nextUserStoryId;
    let currentTaskId = nextTaskId;

    const features = await Promise.all(
      userStories.map(async (userStory) => {
        const userStoryId = existingPmoMap.userStories[userStory.pmoId]
          ? existingPmoMap.userStories[userStory.pmoId].specifaiId
          : `US${currentUserStoryId++}`;

        const userStoryTasks = tasks[userStory.pmoId] || [];

        const formattedTasks = await Promise.all(
          userStoryTasks.map(async (task) => {
            const taskId = existingPmoMap.tasks[task.pmoId]
              ? existingPmoMap.tasks[task.pmoId].specifaiId
              : `TASK${currentTaskId++}`;

            return {
              id: taskId,
              list: task.title,
              acceptance: task.description || '',
              status: 'Active',
              pmoId: task.pmoId,
              pmoIssueType: task.pmoIssueType,
            };
          }),
        );

        return {
          id: userStoryId,
          name: userStory.title,
          description: userStory.description || '',
          pmoId: userStory.pmoId,
          pmoIssueType: userStory.pmoIssueType,
          tasks: formattedTasks,
        };
      }),
    );

    return features;
  }
}
