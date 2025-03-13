import { Injectable } from '@angular/core';
import { AnalyticsTracker } from '../analytics.interface';
import { getAnalyticsToggleState } from 'src/app/services/analytics/analytics-utils';
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
import { CoreService } from '../../core/core.service';

@Injectable({
  providedIn: 'root',
})
export class PostHogAnalyticsManager implements AnalyticsTracker {
  private currentLLMConfig!: LLMConfigModel;
  private isPostHogInitialized = false;

  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig,
  );

  constructor(
    private store: Store,
    private core: CoreService,
  ) {
    this.initAnalytics();

    this.llmConfig$.subscribe((config) => {
      this.currentLLMConfig = config;
    });
  }

  isConfigValid(config: { key?: string; host?: string }): boolean {
    return !!config.key && !!config.host;
}

  private isAnalyticsEnabled(): boolean {
    return getAnalyticsToggleState();
  }

  captureException(error: Error, properties: Record<string, any> = {}): void {
    if (!this.isAnalyticsEnabled()) {
      return;
    }
    posthog.captureException(error, properties);
  }

  trackEvent(
    eventName: AnalyticsEvents,
    properties: Record<string, any> = {},
  ): void {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    posthog.capture(eventName, properties);
  }

  trackResponseTime<T>(source: AnalyticsEventSource) {
    const startTime = Date.now();

    if (!this.isAnalyticsEnabled()) {
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
          if (!this.isAnalyticsEnabled()) {
            return;
          }

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

  initAnalytics() {
    if (!this.isAnalyticsEnabled()) {
      console.log('Analytics tracking is disabled by user preference.');
      return;
    }

    if (this.isPostHogInitialized) {
      console.log('PostHog already initialized, skipping re-initialization.');
      return;
    }

    this.core.getAppConfig().subscribe({
      next: (config) => {
        if (config.key && config.host) {
          this.initPostHog(config.key, config.host);
          this.isPostHogInitialized = true;
        } else {
          console.error('Invalid PostHog configuration received from backend.');
          this.isPostHogInitialized = false;
        }
      },
      error: (error) => {
        console.error(
          'Failed to fetch PostHog configuration from backend:',
          error,
        );
      },
    });
  }

  private initPostHog(key: string, host: string) {
    posthog.init(key, {
      api_host: host,
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
