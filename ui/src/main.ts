import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import * as Sentry from '@sentry/angular';
import { environment } from './environments/environment';
import posthog from 'posthog-js'

if (environment.ENABLE_SENTRY) {
  Sentry.init({
    dsn: environment.SENTRY_DSN,
    environment: environment.SENTRY_ENVIRONMENT,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.breadcrumbsIntegration({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    release: environment.SENTRY_RELEASE,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    tracesSampleRate: 1.0,
  });
} else {
  console.log('Disabling sentry based on the environment configuration.');
}

if (environment.ENABLE_POSTHOG) {
  posthog.init(
    environment.POSTHOG_KEY,
    {
      api_host: environment.POSTHOG_HOST,
      person_profiles: 'always', 
      autocapture: false,
      ip: true,
      capture_pageview: false,
      capture_pageleave: false,
      capture_performance: false,
      disable_session_recording: true
    }
  )
} else {
  console.log('Disabling PostHog based on the environment configuration.');
}
  

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
