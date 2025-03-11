import { Injectable } from '@angular/core';
import { AnalyticsTracker } from '../analytics.interface';
import { environment } from 'src/environments/environment';
import posthog from 'posthog-js';
import {
  AnalyticsEvents,
  AnalyticsEventSource,
  AnalyticsEventStatus
} from '../events/analytics.events';
import { LLMConfigState } from 'src/app/store/llm-config/llm-config.state';
import { Store } from '@ngxs/store';
import { LLMConfigModel } from 'src/app/model/interfaces/ILLMConfig';
import { catchError, finalize, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsManager implements AnalyticsTracker {
  private isEnabled: boolean;
  private currentLLMConfig!: LLMConfigModel;

  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig
  );

  constructor(private store: Store) {
    this.isEnabled = environment.ENABLE_POSTHOG || false;

    this.llmConfig$.subscribe((config) => {
      this.currentLLMConfig = config;
      console.log('Config changes', this.currentLLMConfig);
    });
  }

  captureException(error: Error, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) {
      return;
    }
    posthog.captureException(error, properties);
  }

  trackEvent(
    eventName: AnalyticsEvents,
    properties: Record<string, any> = {}
  ): void {
    if (!this.isEnabled) {
      return;
    }

    posthog.capture(eventName, properties);
  }

  trackResponseTime<T>(source: AnalyticsEventSource) {
    const startTime = Date.now();

    // If analytics are disabled, return an identity operator (passes data through unchanged)
    if (!this.isEnabled) {
      return (observable: Observable<T>): Observable<T> => observable;
    }

    // Otherwise, return the timing operator
    return (observable: Observable<T>): Observable<T> => {
      let status = AnalyticsEventStatus.SUCCESS;
      
      return observable.pipe(
        catchError((error) => {
          status = AnalyticsEventStatus.FAILURE;
          throw error;
        }),
        finalize(() => {
          const duration = Date.now() - startTime;
          this.trackEvent(AnalyticsEvents.LLM_RESPONSE_TIME, {
            durationMs: duration,
            source,
            status
          });
        })
      );
    };
  }
}
