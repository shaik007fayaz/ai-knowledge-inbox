export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  shouldRetry: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

/** Retries with exponential backoff: baseDelay, 2x, 4x... */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= options.attempts || !options.shouldRetry(error)) throw error;
      options.onRetry?.(error, attempt);
      await sleep(options.baseDelayMs * 2 ** (attempt - 1));
    }
  }
}
