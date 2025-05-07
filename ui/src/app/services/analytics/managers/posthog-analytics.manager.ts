import { Injectable } from '@angular/core';
import { AnalyticsTracker } from '../analytics.interface';
import { getAnalyticsToggleState } from 'src/app/services/analytics/utils/analytics.utils';
import posthog from 'posthog-js';
import { AppConfig } from '../../core/core.service';
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
import { APP_CONSTANTS } from 'src/app/constants/app.constants';

@Injectable({
  providedIn: 'root',
})
export class PostHogAnalyticsManager implements AnalyticsTracker {
  private currentLLMConfig!: LLMConfigModel;
  private isPostHogInitialized = false;

  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig,
  );
  private postHogConfig: {
    key: string;
    host: string;
    enabled: boolean;
  } = {
    key: '',
    host: '',
    enabled: false,
  };

  constructor(
    private store: Store,
    private core: CoreService,
  ) {
    this.initAnalytics();

    this.llmConfig$.subscribe((config) => {
      this.currentLLMConfig = config;
      posthog.setPersonProperties({
        current_llm_provider: this.currentLLMConfig.activeProvider
      });
    });
  }

  isConfigValid(config: AppConfig): boolean {
    return !!config.key && !!config.host;
  }

  isEnabled(): boolean {
    return this.postHogConfig.enabled;
  }

  private isAnalyticsEnabled(): boolean {
    return this.postHogConfig.enabled && getAnalyticsToggleState();
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
            provider: this.currentLLMConfig.activeProvider,
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

    const username = localStorage.getItem(APP_CONSTANTS.USER_NAME) ?? '';
    const userId = localStorage.getItem(APP_CONSTANTS.USER_ID) ?? '';

    if (this.isPostHogInitialized) {
      console.log('PostHog already initialized, skipping re-initialization.');
      return;
    }

    this.core
      .getAppConfig()
      .then((config: AppConfig) => {
        this.postHogConfig = { key: config.key, host: config.host, enabled: config.enabled }; ;
        if (!this.postHogConfig.enabled) {
          console.log('PostHog tracking is disabled in the configuration.');
          this.isPostHogInitialized = false;
        } else if (!this.isConfigValid(config)) {
          console.error('Invalid PostHog configuration received.');
          this.isPostHogInitialized = false;
        } else {
          this.initPostHog(config.key, config.host, username, userId);
          this.isPostHogInitialized = true;
        }
      })
      .catch((error) => {
        console.error('Failed to fetch PostHog configuration:', error);
      });
  }

  private initPostHog(
    key: string,
    host: string,
    username: string,
    userId: string,
  ) {
    posthog.init(key, {
      api_host: host,
      person_profiles: 'always',
      autocapture: false,
      ip: true,
      capture_pageleave: false,
      capture_performance: false,
      disable_session_recording: true,
    });
    posthog.identify(userId, {
      username: username   
    });
    console.log('PostHog has been initialized.');
  }
}
