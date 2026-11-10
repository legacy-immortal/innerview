/**
 * @file Zustand store + fetch helper for GET /api/status (backend load snapshot).
 * @module lib/backend-status
 */
import { create } from 'zustand';

/** CPU load snapshot from {@link GET /api/status}. */
export interface CpuStatus {
  readonly cores: number;
  readonly load1: number;
  readonly load5: number;
  readonly load15: number;
  readonly usagePercent: number | null;
  readonly platform: string;
}

/** Memory snapshot from {@link GET /api/status}. */
export interface MemoryStatus {
  readonly totalMB: number;
  readonly freeMB: number;
  readonly usedMB: number;
  readonly usagePercent: number;
}

/** GPU snapshot from {@link GET /api/status}. */
export interface GpuStatus {
  readonly available: boolean;
  readonly name: string | null;
  readonly note: string;
}

/** Request queue snapshot from {@link GET /api/status}. */
export interface RequestStatus {
  readonly active: number;
  readonly queued: number;
  readonly total: number;
  readonly maxActiveObserved: number;
  readonly lastRequestAt: string | null;
}

/** Model loading snapshot from {@link GET /api/status}. */
export interface ModelStatus {
  readonly name: string;
  readonly loading: boolean;
  readonly ready?: boolean;
  readonly failed?: boolean;
  readonly error?: string | null;
}

/**
 * Full backend status snapshot from {@link GET /api/status}.
 *
 * Consumed by {@link useBackendStatusStore} and {@link getLatestBackendStatus}
 * to drive system visualization gauges and indicator dots.
 */
export interface BackendStatus {
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

interface BackendStatusStore {
  readonly backendStatus: BackendStatus | null;
  readonly backendError: string | null;
  readonly refresh: () => Promise<BackendStatus | null>;
}

/** Latest snapshot shared with useSystemDataSource (SystemVisualization). */
let latestSnapshot: BackendStatus | null = null;

/**
 * Synchronous read of the latest backend status snapshot (for waveform/gauge
 * data). Callers must not mutate the returned object.
 * @returns The latest snapshot, or null if none has been fetched yet.
 * @see {@link useBackendStatusStore.refresh} which populates the snapshot
 */
export function getLatestBackendStatus(): BackendStatus | null {
  return latestSnapshot;
}

export const useBackendStatusStore = create<BackendStatusStore>((set) => ({
  backendStatus: null,
  backendError: null,

  refresh: async (): Promise<BackendStatus | null> => {
    try {
      const response = await fetch('/api/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = `Backend status ${response.status}`;
        set({ backendError: error });
        return null;
      }
      const data = (await response.json()) as BackendStatus;
      latestSnapshot = data;
      set({ backendStatus: data, backendError: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ backendError: message });
      return null;
    }
  },
}));

/**
 * Human-readable one-line summary of what the backend is doing.
 * @param status - Backend status snapshot, or null when unknown.
 * @returns A status message such as "Loading model (…)…", "N active, M queued — …", "N request(s) in flight", or "Idle".
 * @see {@link getBackendStatusColor} for the matching indicator color
 */
export function getBackendActivityMessage(
  status: BackendStatus | null
): string {
  if (!status) return 'Backend status unknown';
  const loading = status.models.filter((m) => m.loading);
  if (loading.length > 0) {
    return `Loading model (${loading.map((m) => m.name).join(', ')})…`;
  }
  const { active, queued } = status.requests;
  if (queued > 0) {
    return `${active} active, ${queued} queued — backend is chugging`;
  }
  if (active > 0) {
    return `${active} request${active === 1 ? '' : 's'} in flight`;
  }
  return 'Idle';
}

/**
 * Color for the indicator dot.
 * @param status - Backend status snapshot, or null when unknown.
 * @returns 'green' when idle, 'yellow' when loading or active, 'red' when queued, 'gray' when unknown.
 * @see {@link getBackendActivityMessage} for the matching status message
 */
export function getBackendStatusColor(
  status: BackendStatus | null
): 'green' | 'yellow' | 'red' | 'gray' {
  if (!status) return 'gray';
  const loading = status.models.some((m) => m.loading);
  if (loading) return 'yellow';
  const { active, queued } = status.requests;
  if (queued > 0) return 'red';
  if (active > 0) return 'yellow';
  return 'green';
}
