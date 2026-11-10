/**
 * @file Tracks backend load (active requests, queue, model loading, CPU/memory)
 * so the frontend can explain what the app is doing / why it is chugging.
 * @module services/status-tracker
 */
import { cpus, freemem, loadavg, platform, totalmem, uptime } from 'os';

export interface CpuStatus {
  readonly cores: number;
  readonly load1: number;
  readonly load5: number;
  readonly load15: number;
  /** Approximate per-core utilisation (0–100) from load average. */
  readonly usagePercent: number | null;
  readonly platform: string;
}

export interface MemoryStatus {
  readonly totalMB: number;
  readonly freeMB: number;
  readonly usedMB: number;
  readonly usagePercent: number;
}

export interface GpuStatus {
  readonly available: boolean;
  readonly name: string | null;
  readonly note: string;
}

export interface RequestStatus {
  readonly active: number;
  readonly queued: number;
  readonly total: number;
  readonly maxActiveObserved: number;
  readonly lastRequestAt: string | null;
}

export interface ModelStatus {
  readonly name: string;
  readonly loading: boolean;
  readonly ready?: boolean;
  readonly failed?: boolean;
  readonly error?: string | null;
}

export interface BackendStatusSnapshot {
  readonly status: 'ok';
  readonly timestamp: string;
  readonly uptimeSec: number;
  readonly cpu: CpuStatus;
  readonly memory: MemoryStatus;
  readonly gpu: GpuStatus;
  readonly requests: RequestStatus;
  readonly queue: { readonly depth: number };
  readonly models: ModelStatus[];
}

/** Single-flight concurrency: extra requests beyond this are "queued". */
const MAX_CONCURRENT_REQUESTS = 1;

class StatusTracker {
  private activeRequests = 0;
  private totalRequests = 0;
  private maxActiveObserved = 0;
  private lastRequestAt: string | null = null;
  private readonly startedAt = Date.now();
  private readonly modelLoading = new Map<string, boolean>();

  /**
   * Begin tracking a request. Returns an idempotent end function the caller
   * must invoke when the request (or its streamed body) finishes.
   */
  public beginRequest(): () => void {
    this.activeRequests += 1;
    this.totalRequests += 1;
    this.maxActiveObserved = Math.max(
      this.maxActiveObserved,
      this.activeRequests
    );
    this.lastRequestAt = new Date().toISOString();
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.activeRequests = Math.max(0, this.activeRequests - 1);
    };
  }

  /** Mark whether a named model is currently loading. */
  public setModelLoading(name: string, loading: boolean): void {
    this.modelLoading.set(name, loading);
  }

  public getModelLoading(name: string): boolean {
    return this.modelLoading.get(name) ?? false;
  }

  /** Queue depth: requests waiting behind the in-flight one (serial model). */
  private getQueueDepth(): number {
    return Math.max(0, this.activeRequests - MAX_CONCURRENT_REQUESTS);
  }

  public getSnapshot(extraModels: ModelStatus[] = []): BackendStatusSnapshot {
    const coreCount = cpus().length || 1;
    const [load1, load5, load15] = loadavg();
    const totalBytes = totalmem();
    const freeBytes = freemem();
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    const merged = new Map<string, ModelStatus>();
    for (const model of extraModels) merged.set(model.name, model);
    for (const [name, loading] of this.modelLoading.entries()) {
      merged.set(name, { name, loading });
    }
    const models = Array.from(merged.values());
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(uptime()),
      cpu: {
        cores: coreCount,
        load1: round(load1),
        load5: round(load5),
        load15: round(load15),
        usagePercent: Math.min(100, Math.round((load1 / coreCount) * 100)),
        platform: platform(),
      },
      memory: {
        totalMB: Math.round(totalBytes / (1024 * 1024)),
        freeMB: Math.round(freeBytes / (1024 * 1024)),
        usedMB: Math.round(usedBytes / (1024 * 1024)),
        usagePercent: totalBytes
          ? Math.round((usedBytes / totalBytes) * 100)
          : 0,
      },
      gpu: {
        available: false,
        name: null,
        note: 'GPU telemetry is not available via the Node.js os module on this host',
      },
      requests: {
        active: this.activeRequests,
        queued: this.getQueueDepth(),
        total: this.totalRequests,
        maxActiveObserved: this.maxActiveObserved,
        lastRequestAt: this.lastRequestAt,
      },
      queue: { depth: this.getQueueDepth() },
      models,
    };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export const statusTracker = new StatusTracker();

/** Wrap a streamed Response so request tracking ends when the body closes. */
export function trackStreamedResponse(
  response: Response,
  end: () => void
): Response {
  if (!response.body) {
    end();
    return response;
  }
  const reader = response.body.getReader();
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    end();
  };
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          finish();
          controller.close();
          return;
        }
        if (value) controller.enqueue(value);
      } catch (error) {
        finish();
        controller.error(error);
      }
    },
    cancel() {
      finish();
    },
    start() {
      // No-op: tracking ends on close/cancel/error.
    },
  });
  const headers = new Headers(response.headers);
  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
