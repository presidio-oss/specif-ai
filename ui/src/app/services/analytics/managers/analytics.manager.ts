import { Injectable } from '@angular/core';
import { AnalyticsTracker } from '../analytics.interface';
import { environment } from 'src/environments/environment';
import posthog from 'posthog-js';
import { AnalyticsEvents } from '../events/analytics.events';
import { LLMConfigState } from 'src/app/store/llm-config/llm-config.state';
import { Store } from '@ngxs/store';
import { LLMConfigModel } from 'src/app/model/interfaces/ILLMConfig';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsManager implements AnalyticsTracker {
  private isEnabled: boolean;
  private deviceId: string;
  private currentLLMConfig!: LLMConfigModel;

  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig,
  );

  constructor(private store: Store) {
    this.isEnabled = environment.ENABLE_POSTHOG || false;
    this.deviceId = this.getDeviceId();
    console.log('Device ID', this.deviceId);

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
    properties: Record<string, any> = {},
  ): void {
    if (!this.isEnabled) {
      return;
    }

    posthog.capture(eventName, properties);
  }

  private getDeviceId() {
    return posthog.get_distinct_id();
  }
}
