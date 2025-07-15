import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError, from } from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  mergeMap,
  concatMap,
  toArray,
} from 'rxjs/operators';
import { JIRA_TOAST } from '../../constants/toast.constant';
import { ToasterService } from '../../services/toaster/toaster.service';
import { environment } from '../../../environments/environment';
import { compareADFContent, convertADFToMarkdown, convertMarkdownToADF } from 'src/app/utils/adf.utils';

@Injectable({
  providedIn: 'root',
})
export class JiraService {
  constructor(
    private http: HttpClient,
    private toast: ToasterService,
  ) {}

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      skipLoader: 'true',
    });
  }

  private createEpic(payload: any, token: string, adfContent: any): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue`;
    const issueData = {
      fields: {
        project: { key: payload.projectKey },
        summary: payload.epicName,
        description: { ...adfContent, version: 1 },
        issuetype: { name: 'Epic' },
      },
    };

    return this.http.post(issueUrl, issueData, {
      headers: this.getHeaders(token),
    }).pipe(
      map((epic: any) => epic),
      catchError(this.handleError),
    );
  }

  private updateEpic(payload: any, token: string, adfContent: any): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${payload.pmoId}?returnIssue=true`;
    const updateData = {
      fields: {
        summary: payload.epicName,
        description: { ...adfContent, version: 1 },
      },
    };

    return this.http.put(issueUrl, updateData, {
      headers: this.getHeaders(token),
    }).pipe(
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
            })
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return convertMarkdownToADF(payload.epicDescription).pipe(
              switchMap((adfContent) => this.createEpic(payload, token, adfContent))
            );
          } else {
            return throwError(() => error);
          }
        }),
      );
    } else {
      return convertMarkdownToADF(payload.epicDescription).pipe(
        switchMap((adfContent) => this.createEpic(payload, token, adfContent))
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
            })
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return convertMarkdownToADF(feature.description).pipe(
              switchMap((adfContent) => this.createStory(payload, feature, token, adfContent))
            );
          } else {
            return throwError(error);
          }
        }),
      );
    } else {
      return convertMarkdownToADF(feature.description).pipe(
        switchMap((adfContent) => this.createStory(payload, feature, token, adfContent))
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

    return this.http.post(issueUrl, issueData, {
      headers: this.getHeaders(token),
    }).pipe(
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

    return this.http.put(issueUrl, updatedData, {
      headers: this.getHeaders(token),
    }).pipe(
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
    if (task.subTaskTicketId) {
      const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${task.subTaskTicketId}`;
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
            })
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return convertMarkdownToADF(task.acceptance).pipe(
              switchMap((adfContent) => this.createSubTask(payload, storyKey, task, token, adfContent))
            );
          } else {
            return throwError(error);
          }
        }),
      );
    } else {
      return convertMarkdownToADF(task.acceptance).pipe(
        switchMap((adfContent) => this.createSubTask(payload, storyKey, task, token, adfContent))
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

    return this.http.post(issueUrl, issueData, {
      headers: this.getHeaders(token),
    }).pipe(
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
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${task.subTaskTicketId}?returnIssue=true`;
    const updateData = {
      fields: {
        summary: task.list,
        description: { ...adfContent, version: 1 },
      },
    };

    return this.http.put(issueUrl, updateData, {
      headers: this.getHeaders(token),
    }).pipe(
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
                                subTaskTicketId: subTask.key,
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
    console.error('An error occurred:', error);
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
        syncRequests.push(this.getStoryFromJira(payload, feature, payload.token));
      }
    });

    return from(syncRequests).pipe(
      mergeMap(request => request, environment.JIRA_RATE_LIMIT_CONFIG),
      toArray(),
      map((results: any[]) => {
        const syncResult = {
          epic: null as any,
          features: [] as any[]
        };

        results.forEach(result => {
          if (result.type === 'epic') {
            syncResult.epic = result.data;
          } else if (result.type === 'story') {
            syncResult.features.push(result.data);
          }
        });

        return syncResult;
      }),
      catchError(this.handleError)
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
              lastUpdated: epic.fields.updated
            }
          }))
        );
      }),
      catchError((error) => {
        console.error(`Error fetching epic ${payload.pmoId}:`, error);
        return of({ type: 'epic', data: null });
      })
    );
  }

  private getStoryFromJira(payload: any, feature: any, token: string): Observable<any> {
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
                tasks: [...(feature.tasks || [])]
              }
            };

            if (story.fields.subtasks && story.fields.subtasks.length > 0) {
              const subTaskRequests: Observable<any>[] = story.fields.subtasks.map((subtask: any) =>
                this.getSubTaskFromJira(payload, subtask, token)
              );

              return from(subTaskRequests).pipe(
                mergeMap(request => request, environment.JIRA_RATE_LIMIT_CONFIG),
                toArray(),
                map((subTasks: any[]) => {
                  // Update existing tasks with JIRA data
                  storyData.data.tasks = storyData.data.tasks.map((existingTask: any) => {
                    const matchingSubTask = subTasks.find(st =>
                      st && st.subTaskTicketId === existingTask.subTaskTicketId
                    );

                    if (matchingSubTask) {
                      return {
                        ...existingTask,
                        list: matchingSubTask.summary,
                        acceptance: matchingSubTask.description,
                        status: matchingSubTask.status,
                        lastUpdated: matchingSubTask.lastUpdated
                      };
                    }
                    return existingTask;
                  });

                  return storyData;
                })
              );
            }

            return of(storyData);
          })
        );
      }),
      catchError((error) => {
        console.error(`Error fetching story ${feature.pmoId}:`, error);
        return of({ type: 'story', data: null });
      })
    );
  }

  private getSubTaskFromJira(payload: any, subtask: any, token: string): Observable<any> {
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${subtask.key}`;

    return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
      switchMap((task: any) => {
        return convertADFToMarkdown(task.fields.description).pipe(
          map((markdownDescription) => ({
            subTaskTicketId: task.key,
            summary: task.fields.summary,
            description: markdownDescription,
            status: task.fields.status.name,
            lastUpdated: task.fields.updated
          }))
        );
      }),
      catchError((error) => {
        console.error(`Error fetching subtask ${subtask.key}:`, error);
        return of(null);
      })
    );
  }


}
