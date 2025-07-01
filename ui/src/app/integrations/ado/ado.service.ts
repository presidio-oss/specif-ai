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
import { ToasterService } from '../../services/toaster/toaster.service';
import { environment } from '../../../environments/environment';
import { convertHtmlToMarkdown, convertMarkdownToHtml } from './ado.utils';


@Injectable({
    providedIn: 'root',
})
export class AdoService {
    constructor(
        private http: HttpClient,
        private toast: ToasterService,
    ) { }

    private getHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            Authorization: `Basic ${btoa(`:${token}`)}`,
            'Content-Type': 'application/json-patch+json',
            Accept: 'application/json',
            skipLoader: 'true',
            'X-Skip-Interceptor': 'true',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization, X-Request-With'
        });
    }

    private createFeature(payload: any, token: string, htmlContent: string): Observable<any> {
        const { adoURL, organization, projectName } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/$Feature?api-version=7.0`;

        // Create patch document for Feature
        const patchDocument = [
            {
                op: "add",
                path: "/fields/System.Title",
                value: payload.epicName
            },
            {
                op: "add",
                path: "/fields/System.Description",
                value: htmlContent
            }
        ];

        return this.http.patch(apiUrl, patchDocument, {
            headers: this.getHeaders(token),
        }).pipe(
            map((feature: any) => feature),
            catchError(this.handleError),
        );
    }

    private updateFeature(payload: any, token: string, htmlContent: string): Observable<any> {
        const { adoURL, organization, projectName, featureId } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${featureId}?api-version=7.0`;

        // Update patch document for Feature
        const patchDocument = [
            {
                op: "add",
                path: "/fields/System.Title",
                value: payload.epicName
            },
            {
                op: "add",
                path: "/fields/System.Description",
                value: htmlContent
            }
        ];

        return this.http.patch(apiUrl, patchDocument, {
            headers: this.getHeaders(token),
        }).pipe(
            map((updated: any) => updated),
            catchError(this.handleError),
        );
    }

    createOrUpdateFeature(payload: any, token: string): Observable<any> {
        if (payload.featureId) {
            const issueUrl = `${payload.adoURL}/${payload.organization}/${payload.projectName}/_apis/wit/workitems/${payload.featureId}?api-version=7.0`;
            return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
                switchMap((issue: any) => {
                    return convertMarkdownToHtml(payload.epicDescription).pipe(
                        switchMap((newHtml) => {
                            return this.updateFeature(payload, token, newHtml);
                        })
                    );
                }),
                catchError((error) => {
                    if (error.status === 404) {
                        return convertMarkdownToHtml(payload.epicDescription).pipe(
                            switchMap((htmlContent) => this.createFeature(payload, token, htmlContent))
                        );
                    } else {
                        return throwError(() => error);
                    }
                }),
            );
        } else {
            return convertMarkdownToHtml(payload.epicDescription).pipe(
                switchMap((htmlContent) => this.createFeature(payload, token, htmlContent))
            );
        }
    }

    private createPlatformFeature(payload: any, feature: any, token: string, htmlContent: string): Observable<any> {
        const { adoURL, organization, projectName } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/$Platform Feature?api-version=7.0`;

        // Create patch document for Platform Feature
        const patchDocument = [
            {
                op: "add",
                path: "/fields/System.Title",
                value: feature.name
            },
            {
                op: "add",
                path: "/fields/System.Description",
                value: htmlContent
            },
            {
                op: "add",
                path: "/relations/-",
                value: {
                    rel: "System.LinkTypes.Hierarchy-Reverse",
                    url: `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${payload.featureId}`
                }
            }
        ];

        return this.http.patch(apiUrl, patchDocument, {
            headers: this.getHeaders(token),
        }).pipe(
            map((platformFeature: any) => platformFeature),
            catchError(this.handleError),
        );
    }

    private updatePlatformFeature(payload: any, feature: any, token: string, htmlContent: string): Observable<any> {
        const { adoURL, organization, projectName } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${feature.platformFeatureId}?api-version=7.0`;

        // Update patch document for Platform Feature
        const patchDocument = [
            {
                op: "add",
                path: "/fields/System.Title",
                value: feature.name
            },
            {
                op: "add",
                path: "/fields/System.Description",
                value: htmlContent
            }
        ];

        return this.http.patch(apiUrl, patchDocument, {
            headers: this.getHeaders(token),
        }).pipe(
            map((updated: any) => updated),
            catchError(this.handleError),
        );
    }

    createOrUpdatePlatformFeature(payload: any, feature: any, token: string): Observable<any> {
        if (feature.platformFeatureId) {
            const issueUrl = `${payload.adoURL}/${payload.organization}/${payload.projectName}/_apis/wit/workitems/${feature.platformFeatureId}?api-version=7.0`;
            return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
                switchMap((issue: any) => {
                    return convertMarkdownToHtml(feature.description).pipe(
                        switchMap((newHtml) => {
                            return this.updatePlatformFeature(payload, feature, token, newHtml);
                        })
                    );
                }),
                catchError((error) => {
                    if (error.status === 404) {
                        return convertMarkdownToHtml(feature.description).pipe(
                            switchMap((htmlContent) => this.createPlatformFeature(payload, feature, token, htmlContent))
                        );
                    } else {
                        return throwError(() => error);
                    }
                }),
            );
        } else {
            return convertMarkdownToHtml(feature.description).pipe(
                switchMap((htmlContent) => this.createPlatformFeature(payload, feature, token, htmlContent))
            );
        }
    }

    private createUserStory(payload: any, platformFeatureId: string, task: any, token: string, htmlContent: string): Observable<any> {
        const { adoURL, organization, projectName } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/$User Story?api-version=7.0`;

        // Create patch document for User Story
        const patchDocument = [
            {
                op: "add",
                path: "/fields/System.Title",
                value: task.list
            },
            {
                op: "add",
                path: "/fields/System.Description",
                value: htmlContent
            },
            {
                op: "add",
                path: "/relations/-",
                value: {
                    rel: "System.LinkTypes.Hierarchy-Reverse",
                    url: `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${platformFeatureId}`
                }
            }
        ];

        return this.http.patch(apiUrl, patchDocument, {
            headers: this.getHeaders(token),
        }).pipe(
            map((userStory: any) => userStory),
            catchError(this.handleError),
        );
    }

    private updateUserStory(payload: any, task: any, token: string, htmlContent: string): Observable<any> {
        const { adoURL, organization, projectName } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${task.userStoryId}?api-version=7.0`;

        // Update patch document for User Story
        const patchDocument = [
            {
                op: "add",
                path: "/fields/System.Title",
                value: task.list
            },
            {
                op: "add",
                path: "/fields/System.Description",
                value: htmlContent
            }
        ];

        return this.http.patch(apiUrl, patchDocument, {
            headers: this.getHeaders(token),
        }).pipe(
            map((updated: any) => updated),
            catchError(this.handleError),
        );
    }

    createOrUpdateUserStory(payload: any, platformFeatureId: string, task: any, token: string): Observable<any> {
        if (task.userStoryId) {
            const issueUrl = `${payload.adoURL}/${payload.organization}/${payload.projectName}/_apis/wit/workitems/${task.userStoryId}?api-version=7.0`;
            return this.http.get(issueUrl, { headers: this.getHeaders(token) }).pipe(
                switchMap((issue: any) => {
                    return convertMarkdownToHtml(task.acceptance).pipe(
                        switchMap((newHtml) => {
                            return this.updateUserStory(payload, task, token, newHtml);
                        })
                    );
                }),
                catchError((error) => {
                    if (error.status === 404) {
                        return convertMarkdownToHtml(task.acceptance).pipe(
                            switchMap((htmlContent) => this.createUserStory(payload, platformFeatureId, task, token, htmlContent))
                        );
                    } else {
                        return throwError(() => error);
                    }
                }),
            );
        } else {
            return convertMarkdownToHtml(task.acceptance).pipe(
                switchMap((htmlContent) => this.createUserStory(payload, platformFeatureId, task, token, htmlContent))
            );
        }
    }

    createOrUpdateTickets(payload: any): Observable<any> {
        this.toast.showInfo('Pushing to Azure DevOps...');
        const token = payload.token;

        return this.createOrUpdateFeature(payload, token).pipe(
            switchMap((feature: any) => {
                payload.featureId = feature.id;

                const result = {
                    featureName: payload.epicName,
                    featureId: feature.id,
                    features: [] as any[],
                };

                const platformFeatureRequests = from(payload.features).pipe(
                    mergeMap(
                        (feature: any) =>
                            this.createOrUpdatePlatformFeature(payload, feature, token).pipe(
                                switchMap((platformFeature: any) => {
                                    const platformFeatureDetails = {
                                        platformFeatureName: feature.name,
                                        platformFeatureId: platformFeature.id,
                                        tasks: [] as any[],
                                    };

                                    if (feature.tasks && feature.tasks.length > 0) {
                                        const taskRequests = from(feature.tasks).pipe(
                                            mergeMap(
                                                (task: any) =>
                                                    this.createOrUpdateUserStory(
                                                        payload,
                                                        platformFeature.id,
                                                        task,
                                                        token,
                                                    ).pipe(
                                                        map((userStory: any) => {
                                                            platformFeatureDetails.tasks.push({
                                                                userStoryName: task.list,
                                                                userStoryId: userStory.id,
                                                            });
                                                        }),
                                                    ),
                                                5, // Limit concurrent requests
                                            ),
                                        );

                                        return taskRequests.pipe(
                                            map(() => {
                                                result.features.push(platformFeatureDetails);
                                            }),
                                        );
                                    } else {
                                        result.features.push(platformFeatureDetails);
                                        return of(null);
                                    }
                                }),
                            ),
                        5, // Limit concurrent requests
                    ),
                );

                return platformFeatureRequests.pipe(
                    concatMap(() => of(null)),
                    toArray(),
                    map(() => result),
                );
            }),
        );
    }

    syncFromAdo(payload: any): Observable<any> {
        this.toast.showInfo('Syncing from Azure DevOps...');

        const syncRequests: Observable<any>[] = [];

        if (payload.featureId) {
            syncRequests.push(this.getFeatureFromAdo(payload, payload.token));
        }

        payload.features.forEach((feature: any) => {
            if (feature.platformFeatureId) {
                syncRequests.push(this.getPlatformFeatureFromAdo(payload, feature, payload.token));
            }
        });

        return from(syncRequests).pipe(
            mergeMap((request: Observable<any>) => request, 5), // Limit concurrent requests
            toArray(),
            map((results: any[]) => {
                const syncResult = {
                    feature: null as any,
                    features: [] as any[]
                };

                results.forEach(result => {
                    if (result.type === 'feature') {
                        syncResult.feature = result.data;
                    } else if (result.type === 'platformFeature') {
                        syncResult.features.push(result.data);
                    }
                });

                return syncResult;
            }),
            catchError(this.handleError)
        );
    }

    private getFeatureFromAdo(payload: any, token: string): Observable<any> {
        const { adoURL, organization, projectName, featureId } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${featureId}?api-version=7.0`;

        return this.http.get(apiUrl, { headers: this.getHeaders(token) }).pipe(
            switchMap((feature: any) => {
                return convertHtmlToMarkdown(feature.fields['System.Description'] || '').pipe(
                    map((markdownDescription) => ({
                        type: 'feature',
                        data: {
                            title: feature.fields['System.Title'],
                            requirement: markdownDescription,
                            featureId: feature.id,
                            status: feature.fields['System.State'],
                            lastUpdated: feature.fields['System.ChangedDate']
                        }
                    }))
                );
            }),
            catchError((error) => {
                console.error(`Error fetching feature ${featureId}:`, error);
                return of({ type: 'feature', data: null });
            })
        );
    }

    private getPlatformFeatureFromAdo(payload: any, feature: any, token: string): Observable<any> {
        const { adoURL, organization, projectName } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${feature.platformFeatureId}?api-version=7.0`;

        return this.http.get(apiUrl, { headers: this.getHeaders(token) }).pipe(
            switchMap((platformFeature: any) => {
                return convertHtmlToMarkdown(platformFeature.fields['System.Description'] || '').pipe(
                    map((markdownDescription) => {
                        const platformFeatureData = {
                            type: 'platformFeature',
                            data: {
                                id: feature.id,
                                name: platformFeature.fields['System.Title'],
                                description: markdownDescription,
                                platformFeatureId: platformFeature.id,
                                status: platformFeature.fields['System.State'],
                                lastUpdated: platformFeature.fields['System.ChangedDate'],
                                tasks: [...(feature.tasks || [])]
                            }
                        };
                        return platformFeatureData;
                    }),
                    switchMap((platformFeatureData) => {
                        // Get related user stories
                        const relationsUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${feature.platformFeatureId}?$expand=relations&api-version=7.0`;

                        return this.http.get(relationsUrl, { headers: this.getHeaders(token) }).pipe(
                            switchMap((relationResponse: any) => {
                                const childRelations = relationResponse.relations?.filter((relation: any) =>
                                    relation.rel === 'System.LinkTypes.Hierarchy-Forward'
                                ) || [];

                                if (childRelations.length > 0) {
                                    const userStoryRequests = childRelations.map((relation: any) => {
                                        const userStoryId = relation.url.split('/').pop();
                                        return this.getUserStoryFromAdo(payload, userStoryId, token);
                                    });
                                    return from(userStoryRequests as Observable<any>[]).pipe(
                                        mergeMap((request: Observable<any>) => request, 5), // Limit concurrent requests
                                        toArray(),
                                        map((userStories: any[]) => {
                                            // Update existing tasks with ADO data
                                            platformFeatureData.data.tasks = platformFeatureData.data.tasks.map((existingTask: any) => {
                                                const matchingUserStory = userStories.find(us =>
                                                    us && us.userStoryId === existingTask.userStoryId
                                                );

                                                if (matchingUserStory) {
                                                    return {
                                                        ...existingTask,
                                                        list: matchingUserStory.title,
                                                        acceptance: matchingUserStory.description,
                                                        status: matchingUserStory.status,
                                                        lastUpdated: matchingUserStory.lastUpdated
                                                    };
                                                }
                                                return existingTask;
                                            });

                                            return platformFeatureData;
                                        })
                                    );
                                }

                                return of(platformFeatureData);
                            })
                        );
                    })
                );
            }),
            catchError((error) => {
                console.error(`Error fetching platform feature ${feature.platformFeatureId}:`, error);
                return of({ type: 'platformFeature', data: null });
            })
        );
    }

    private getUserStoryFromAdo(payload: any, userStoryId: string, token: string): Observable<any> {
        const { adoURL, organization, projectName } = payload;
        const apiUrl = `${adoURL}/${organization}/${projectName}/_apis/wit/workitems/${userStoryId}?api-version=7.0`;

        return this.http.get(apiUrl, { headers: this.getHeaders(token) }).pipe(
            switchMap((userStory: any) => {
                return convertHtmlToMarkdown(userStory.fields['System.Description'] || '').pipe(
                    map((markdownDescription) => ({
                        userStoryId: userStory.id,
                        title: userStory.fields['System.Title'],
                        description: markdownDescription,
                        status: userStory.fields['System.State'],
                        lastUpdated: userStory.fields['System.ChangedDate']
                    }))
                );
            }),
            catchError((error) => {
                console.error(`Error fetching user story ${userStoryId}:`, error);
                return of(null);
            })
        );
    }

    private handleError(error: any): Observable<never> {
        console.error('An error occurred:', error);
        return throwError(() => new Error(error.message || 'Server Error'));
    }
}
