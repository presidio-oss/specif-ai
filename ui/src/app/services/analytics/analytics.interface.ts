import { OperatorFunction } from 'rxjs';
import {
  AnalyticsEvents,
  AnalyticsEventSource,
} from './events/analytics.events';

export abstract class AnalyticsTracker {
  /**
   * Tracks an event with the given name and properties.
   * @param eventName - The name of the event to track.
   * @param properties - Optional additional properties associated with the event.
   * @example
   * // Track an event with additional properties
   * analyticsManager.trackEvent(AnalyticsEvents.ITEM_PURCHASED, {
   *   itemId: 'product-123',
   *   price: 19.99,
   *   currency: 'USD'
   * });
   */
  abstract trackEvent(
    eventName: AnalyticsEvents,
    properties?: Record<string, any>,
  ): void;

  /**
   * Captures and logs an exception.
   * @param error - The error object to be captured.
   * @param properties - Optional additional properties to log with the error.
   * @example
   * try {
   *   // Operation that failed
   * } catch (error) {
   *   analyticsManager.captureException(error, {
   *     userId: 'user-456',
   *     operation: 'data-import',
   *     attemptNumber: 2
   *   });
   * }
   */
  abstract captureException(
    error: Error,
    properties?: Record<string, any>,
  ): void;

  /**
   * Tracks the time from when the observable is subscribed to until
   * it first emits a value or an error.
   *
   * @param source - The source identifier for the analytics event.
   * @example
   * someObservable$.pipe(
   *   analyticsManager.trackResponseTime(AnalyticsEventSource.SOURCE)
   * ).subscribe(data => {
   *   // Handle response
   * });
   */
  abstract trackResponseTime<T>(
    source: AnalyticsEventSource,
  ): OperatorFunction<T, T>;

  /**
   * Initializes the analytics tracking service with the necessary configuration.
   * This method should be called before any tracking methods are used to ensure
   * the analytics service is properly configured and ready to capture events.
   *
   * @example
   * // Initialize analytics during application startup
   * analyticsManager.initAnalytics();
   */
  abstract initAnalytics(): void;

  /**
   * Validate the given configuration object.
   * @param config - The configuration object to validate.
   * @returns A boolean indicating whether the configuration is valid.
   */
  abstract isConfigValid(config: any): boolean;
}

