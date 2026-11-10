/**
 * Streaming helpers: throttle/coalesce bursts of chunks so a fast
 * upstream does not flood a slow client, while preserving the exact
 * byte stream (chunks are only re-batched, never dropped or reordered).
 */

/** Default throttle window: ~40 flushes per second at most. */
export const DEFAULT_STREAM_THROTTLE_MS = 25;

/**
 * Wrap a byte stream so that chunks produced faster than `intervalMs`
 * are coalesced into a single enqueue per window. The final partial
 * window is always flushed, including on error/cancel.
 */
export function throttleReadableStream(
  source: ReadableStream<Uint8Array>,
  intervalMs: number = DEFAULT_STREAM_THROTTLE_MS
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      let pending: Uint8Array[] = [];
      let pendingBytes = 0;
      let lastFlush = 0;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const flush = (): void => {
        if (pending.length === 0) return;
        if (pending.length === 1) {
          controller.enqueue(pending[0]);
        } else {
          const merged = new Uint8Array(pendingBytes);
          let offset = 0;
          for (const chunk of pending) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }
          controller.enqueue(merged);
        }
        pending = [];
        pendingBytes = 0;
        lastFlush = Date.now();
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      const scheduleFlush = (): void => {
        if (timer) return;
        const wait = Math.max(0, intervalMs - (Date.now() - lastFlush));
        timer = setTimeout(flush, wait);
        timer.unref?.();
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value || value.byteLength === 0) continue;
          pending.push(value);
          pendingBytes += value.byteLength;
          if (Date.now() - lastFlush >= intervalMs) {
            flush();
          } else {
            scheduleFlush();
          }
        }
        flush();
        controller.close();
      } catch (error) {
        flush();
        controller.error(error);
      } finally {
        if (timer) clearTimeout(timer);
        reader.releaseLock();
      }
    },
    async cancel(reason) {
      // Propagate cancellation upstream without flushing partial data.
      try {
        await source.cancel(reason);
      } catch {
        // Upstream already closed; nothing to do.
      }
    },
  });
}

/**
 * Throttled SSE writer: buffers encoded events and writes at most once
 * per `intervalMs`, coalescing rapid upstream chunks (e.g. token
 * streams) into fewer, larger network writes. Wire format is unchanged:
 * each event is still `data: <json>\n\n`, terminated by `[DONE]`.
 */
export function createThrottledSSEStream<T>(
  stream: AsyncIterable<T>,
  intervalMs: number = DEFAULT_STREAM_THROTTLE_MS
): Response {
  const encoder = new TextEncoder();
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  } as const;

  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        let pending: string[] = [];
        let lastFlush = 0;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const flush = (): void => {
          if (pending.length === 0) return;
          controller.enqueue(encoder.encode(pending.join('')));
          pending = [];
          lastFlush = Date.now();
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        };

        const scheduleFlush = (): void => {
          if (timer) return;
          const wait = Math.max(0, intervalMs - (Date.now() - lastFlush));
          timer = setTimeout(flush, wait);
          timer.unref?.();
        };

        try {
          for await (const chunk of stream) {
            pending.push(`data: ${JSON.stringify(chunk)}\n\n`);
            if (Date.now() - lastFlush >= intervalMs) {
              flush();
            } else {
              scheduleFlush();
            }
          }
          pending.push('data: [DONE]\n\n');
          flush();
          controller.close();
        } catch (error) {
          flush();
          controller.error(error);
        } finally {
          if (timer) clearTimeout(timer);
        }
      },
    }),
    { headers }
  );
}
