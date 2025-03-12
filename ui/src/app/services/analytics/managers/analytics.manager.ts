import { Injectable } from '@angular/core';
import { AnalyticsTracker } from '../analytics.interface';
import { environment } from 'src/environments/environment';
import posthog from 'posthog-js';
import {
  AnalyticsEvents,
  AnalyticsEventSource,
  AnalyticsEventStatus,
} from '../events/analytics.events';
import { LLMConfigState } from 'src/app/store/llm-config/llm-config.state';
import { Store } from '@ngxs/store';
import { LLMConfigModel } from 'src/app/model/interfaces/ILLMConfig';
import { catchError, finalize, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsManager implements AnalyticsTracker {
  private static instance: AnalyticsManager;

  private isEnabled: boolean;
  private currentLLMConfig!: LLMConfigModel;

  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig,
  );

  constructor(private store: Store) {
    AnalyticsManager.instance = this;

    this.isEnabled = environment.ENABLE_POSTHOG || false;

    if (this.isEnabled) {
      this.initializePostHog();
    } else {
      console.log('Disabling PostHog based on the environment configuration.');
    }

    this.llmConfig$.subscribe((config) => {
      this.currentLLMConfig = config;
      console.log('Config changes', this.currentLLMConfig);
    });
  }

  public static getInstance(): AnalyticsManager {
    return AnalyticsManager.instance;
  }

  captureException(error: Error, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) {
      return;
    }
    posthog.captureException(error, properties);
  }

  trackEvent(
    eventName: AnalyticsEvents,
    properties: Record<string, any> = {},
  ): void {
    if (!this.isEnabled) {
      return;
    }

    posthog.capture(eventName, properties);
  }

  trackResponseTime<T>(source: AnalyticsEventSource) {
    const startTime = Date.now();

    if (!this.isEnabled) {
      return (observable: Observable<T>): Observable<T> => observable;
    }

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
            status,
            model: this.currentLLMConfig.model,
            provider: this.currentLLMConfig.provider,
          });
        }),
      );
    };
  }

  private initializePostHog() {
    posthog.init(environment.POSTHOG_KEY, {
      api_host: environment.POSTHOG_HOST,
      person_profiles: 'always',
      autocapture: false,
      ip: true,
      capture_pageview: false,
      capture_pageleave: false,
      capture_performance: false,
      disable_session_recording: true,
    });
  }
}
