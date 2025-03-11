import { Observable, OperatorFunction } from 'rxjs';
import { AnalyticsEventSource } from './events/analytics.events';

export interface AnalyticsTracker {
  /**
   * Tracks an event with the given name and properties.
   * @param eventName - The name of the event to track.
   * @param properties - Optional additional properties associated with the event.
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void;

  /**
   * Captures and logs an exception.
   * @param error - The error object to be captured.
   * @param properties - Optional additional properties to log with the error.
   */
  captureException(error: Error, properties?: Record<string, any>): void;

  /**
   * Tracks the time from when the observable is subscribed to until
   * it first emits a value or an error.
   *
   * @param source - The source identifier for the analytics event.
   *
   * @example
   * // Usage example
   * someObservable$.pipe(
   *   analyticsManager.trackResponseTime(AnalyticsEventSource.SOURCE)
   * ).subscribe(data => {
   *   // Handle response
   * });
   */
  trackResponseTime<T>(source: AnalyticsEventSource): OperatorFunction<T, T>;
}
