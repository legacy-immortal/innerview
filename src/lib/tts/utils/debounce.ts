// Debounce utility for async functions

/**
 * Debounce an async function
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounceAsync<
  T extends (...args: unknown[]) => Promise<unknown>
>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: Awaited<ReturnType<T>>) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;

  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return new Promise((resolve, reject) => {
      // Cancel previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Store resolve/reject for this call
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

