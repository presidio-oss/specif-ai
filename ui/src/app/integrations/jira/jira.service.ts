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
import { MarkdownTransformer } from '@atlaskit/editor-markdown-transformer';
import { JSONDocNode, JSONTransformer } from '@atlaskit/editor-json-transformer';
import { BitbucketTransformer } from "@atlaskit/editor-bitbucket-transformer";
import { defaultSchema } from '@atlaskit/adf-schema/schema-default';

const atlasMarkdownTransformer = new MarkdownTransformer();
const atlasJsonTransformer = new JSONTransformer();
const atlasBitbucketTransformer = new BitbucketTransformer(defaultSchema);

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
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${payload.epicTicketId}?returnIssue=true`;
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
    if (payload.epicTicketId) {
      const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${payload.epicTicketId}`;
      return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
        switchMap((issue: any) => {
          return this.convertMarkdownToADF(payload.epicDescription).pipe(
            switchMap((newADF) => {
              const existingADF = issue.fields.description || {};
              if (
                issue.fields.summary !== payload.epicName ||
                !this.compareADFContent(existingADF, newADF)
              ) {
                return this.updateEpic(payload, token, newADF);
              }
              return of(issue);
            })
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return this.convertMarkdownToADF(payload.epicDescription).pipe(
              switchMap((adfContent) => this.createEpic(payload, token, adfContent))
            );
          } else {
            return throwError(() => error);
          }
        }),
      );
    } else {
      return this.convertMarkdownToADF(payload.epicDescription).pipe(
        switchMap((adfContent) => this.createEpic(payload, token, adfContent))
      );
    }
  }

  createOrUpdateStory(
    payload: any,
    feature: any,
    token: string,
  ): Observable<any> {
    if (feature.storyTicketId) {
      const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${feature.storyTicketId}`;
      return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
        switchMap((issue: any) => {
          return this.convertMarkdownToADF(feature.description).pipe(
            switchMap((newADF) => {
              const existingADF = issue.fields.description || {};
              if (
                issue.fields.summary !== feature.name ||
                !this.compareADFContent(existingADF, newADF)
              ) {
                return this.updateStory(payload, feature, token, newADF);
              }
              return of(issue);
            })
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return this.convertMarkdownToADF(feature.description).pipe(
              switchMap((adfContent) => this.createStory(payload, feature, token, adfContent))
            );
          } else {
            return throwError(error);
          }
        }),
      );
    } else {
      return this.convertMarkdownToADF(feature.description).pipe(
        switchMap((adfContent) => this.createStory(payload, feature, token, adfContent))
      );
    }
  }

  private convertMarkdownToADF(markdown: string): Observable<any> {
    return of(
      atlasJsonTransformer.encode(atlasMarkdownTransformer.parse(markdown))
    );
  }

  private compareADFContent(content1: any, content2: any): boolean {
    const content1Copy = { ...content1 };
    const content2Copy = { ...content2 };
    delete content1Copy.version;
    delete content2Copy.version;
    return JSON.stringify(content1Copy) === JSON.stringify(content2Copy);
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
        parent: { key: payload.epicTicketId },
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
    const issueUrl = `${payload.jiraUrl}/rest/api/3/issue/${feature.storyTicketId}?returnIssue=true`;
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
          return this.convertMarkdownToADF(task.acceptance).pipe(
            switchMap((newADF) => {
              const existingADF = issue.fields.description || {};
              if (
                issue.fields.summary !== task.list ||
                !this.compareADFContent(existingADF, newADF)
              ) {
                return this.updateSubTask(payload, task, token, newADF);
              }
              return of(issue);
            })
          );
        }),
        catchError((error) => {
          if (error.status === 404) {
            return this.convertMarkdownToADF(task.acceptance).pipe(
              switchMap((adfContent) => this.createSubTask(payload, storyKey, task, token, adfContent))
            );
          } else {
            return throwError(error);
          }
        }),
      );
    } else {
      return this.convertMarkdownToADF(task.acceptance).pipe(
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
        payload.epicTicketId = epic.key;

        const result = {
          epicName: payload.epicName,
          epicTicketId: epic.key,
          features: [] as any[],
        };

        const storyRequests = from(payload.features).pipe(
          mergeMap(
            (feature: any) =>
              this.createOrUpdateStory(payload, feature, payload.token).pipe(
                switchMap((story: any) => {
                  const storyDetails = {
                    storyName: feature.name,
                    storyTicketId: story.key,
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
}
