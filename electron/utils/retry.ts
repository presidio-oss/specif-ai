interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryAllErrors?: boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1_000,
  maxDelay: 10_000,
  retryAllErrors: false,
};

export function withRetry(options: RetryOptions = {}) {
  const { maxRetries, baseDelay, maxDelay, retryAllErrors } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error: any) {
          const isLastAttempt = attempt === maxRetries - 1;
          const isSyntaxError = error instanceof SyntaxError;
          const shouldRetry = retryAllErrors || error?.status === 429 || isSyntaxError;

          if (!shouldRetry || isLastAttempt) {
            throw error;
          }

          if (isSyntaxError) {
            console.log(`[Retry] JSON parsing failed, retrying attempt ${attempt + 1}/${maxRetries}`);
          }

          // Get retry delay from header or calculate exponential backoff
          // Check various rate limit headers
          const retryAfter =
            error.headers?.["retry-after"] ||
            error.headers?.["x-ratelimit-reset"] ||
            error.headers?.["ratelimit-reset"];

          let delay: number;
          if (retryAfter) {
            // Handle both delta-seconds and Unix timestamp formats
            const retryValue = parseInt(retryAfter, 10);
            if (retryValue > Date.now() / 1000) {
              // Unix timestamp
              delay = retryValue * 1000 - Date.now();
            } else {
              // Delta seconds
              delay = retryValue * 1000;
            }
          } else {
            // Use exponential backoff if no header
            delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
          }

          console.log(
            `[Retry] Attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay. Error: ${error.message}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // This should never happen as the last attempt will either return or throw
      throw new Error("Maximum retries reached");
    };

    return descriptor;
  };
}
