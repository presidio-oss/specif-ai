export interface AnalyticsTracker {
  /**
   * The timestamp when the timer was started.
   */
  startTime: number | null;

  /**
   * Tracks an event with the given name and properties.
   * @param eventName - The name of the event to track.
   * @param properties -  (Optional) Additional properties associated with the event.
   */

  trackEvent(eventName: string, properties?: Record<string, any>): void;

  /**
   * Captures and logs an exception.
   * @param error - The error object to be captured.
   * @param properties - Optional additional properties to log with the error.
   */
  captureException(error: Error, properties?: Record<string, any>): void;

  /**
   * Starts the timer for tracking response time.
   */
  startTimer(): void;

  /**
   * Stops the timer and logs the elapsed time as an event.
   */
  stopTimer(): void;
}
