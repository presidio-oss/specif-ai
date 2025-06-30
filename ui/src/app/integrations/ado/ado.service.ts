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

    private createFeature(payload: any, token: string): Observable<any> {
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
                value: payload.epicDescription
            }
        ];

        return this.http.patch(apiUrl, patchDocument, {
            headers: this.getHeaders(token),
        }).pipe(
            map((feature: any) => feature),
            catchError(this.handleError),
        );
    }

    private updateFeature(payload: any, token: string): Observable<any> {
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
                value: payload.epicDescription
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
            return this.updateFeature(payload, token);
        } else {
            return this.createFeature(payload, token);
        }
    }

    private createPlatformFeature(payload: any, feature: any, token: string): Observable<any> {
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
                value: feature.description
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

    private updatePlatformFeature(payload: any, feature: any, token: string): Observable<any> {
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
                value: feature.description
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
            return this.updatePlatformFeature(payload, feature, token);
        } else {
            return this.createPlatformFeature(payload, feature, token);
        }
    }

    private createUserStory(payload: any, platformFeatureId: string, task: any, token: string): Observable<any> {
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
                value: task.acceptance
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

    private updateUserStory(payload: any, task: any, token: string): Observable<any> {
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
                value: task.acceptance
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
            return this.updateUserStory(payload, task, token);
        } else {
            return this.createUserStory(payload, platformFeatureId, task, token);
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
        // This will be implemented later
        return of({
            feature: null,
            features: []
        });
    }

    private handleError(error: any): Observable<never> {
        console.error('An error occurred:', error);
        return throwError(() => new Error(error.message || 'Server Error'));
    }
}
