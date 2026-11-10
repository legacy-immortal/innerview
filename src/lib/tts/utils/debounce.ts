/**
 * @file debounce.ts — Debounce utility for async functions.
 * @module lib/tts/utils/debounce
 *
 * Debounces an asynchronous function so only the most recent invocation
 * settles, cancelling any earlier in-flight call. Used by the Kokoro TTS
 * model to defer worker reinitialization when configuration changes.
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: Awaited<ReturnType<T>>) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;

  /**
   * Debounce wrapper. Each call resets the timer; only the latest call's
   * promise resolves/rejects, so stale invocations never surface results.
   * @param args - Arguments forwarded to the debounced function.
   * @returns A promise that settles with the latest invocation's result.
   */
  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return new Promise((resolve, reject) => {
      // Cancel previous timeout so only the latest invocation can settle.
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Store resolve/reject for this call so the timer callback can settle
      // the right promise.
      pendingResolve = resolve;
      pendingReject = reject;

      // Set new timeout
      timeoutId = setTimeout(async () => {
        timeoutId = null;

        try {
          // Execute the function
          const result = await fn(...args);

          // Resolve pending promise
          if (pendingResolve) {
            pendingResolve(result as Awaited<ReturnType<T>>);
            pendingResolve = null;
            pendingReject = null;
          }
        } catch (error) {
          // Reject pending promise
          if (pendingReject) {
            pendingReject(error instanceof Error ? error : new Error(String(error)));
            pendingResolve = null;
            pendingReject = null;
          }
        }
      }, delay);
    });
  };
}
