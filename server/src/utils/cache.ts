/**
 * Small bounded TTL cache used to avoid repeating heavy work
 * (provider probes, embeddings, audio proxies, transcription).
 *
 * Entries expire after `ttlMs` and the cache evicts the
 * least-recently-used entry when `maxEntries` is exceeded.
 * All APIs are synchronous; callers cache promises only if they
 * also handle in-flight deduplication themselves.
 */
import { createHash } from 'node:crypto';

export interface TtlCacheOptions {
  /** Time an entry stays valid, in milliseconds. */
  ttlMs: number;
  /** Maximum number of entries retained. Defaults to 100. */
  maxEntries?: number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(options: TtlCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries ?? 100;
  }

  /** Read an entry; returns undefined on miss or expiry. */
  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.misses += 1;
      return undefined;
    }
    // Refresh LRU order.
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  /** Insert or replace an entry, evicting LRU entries past the cap. */
  set(key: K, value: V): void {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as K | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  /** Return the cached value or compute, cache, and return it. */
  getOrCompute(key: K, compute: () => V): V {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = compute();
    this.set(key, value);
    return value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  getStats(): { hits: number; misses: number; size: number } {
    return { hits: this.hits, misses: this.misses, size: this.entries.size };
  }
}

/** Stable hex digest for cache keys derived from arbitrary input. */
export function hashText(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Debounce helper: collapse bursts of calls into one trailing call.
 * Returns a function that schedules `fn` after `waitMs` of quiet.
 * The timer is unref'd so a pending save never keeps the process alive.
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number
): ((...args: A) => void) & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: A | null = null;

  const run = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pendingArgs) {
      const args = pendingArgs;
      pendingArgs = null;
      fn(...args);
    }
  };

  const debounced = ((...args: A): void => {
    pendingArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, waitMs);
    timer.unref?.();
  }) as ((...args: A) => void) & { cancel: () => void; flush: () => void };

  debounced.cancel = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
    pendingArgs = null;
  };
  debounced.flush = run;
  return debounced;
}
