/**
 * @file useBackendStatus.ts — Polls GET /api/status so the UI shows what the backend is doing.
 * @module hooks/useBackendStatus
 *
 * Polls the backend status endpoint every 3 seconds (paused while the tab is
 * hidden) so the UI can surface what the backend is doing. Returns the latest
 * snapshot plus a human-readable activity message, status color, and a manual
 * refresh action. Consumed by the condensed chat backend status indicator.
 */
import {
  getBackendActivityMessage,
  getBackendStatusColor,
  useBackendStatusStore,
  type BackendStatus,
} from '@/lib/backend-status';
import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 3000;

/**
 * Poll backend status every 3s; paused while the tab is hidden.
 * Returns the latest snapshot plus a human-readable activity message.
 */
export function useBackendStatus(): {
  /** Latest backend status snapshot (null until first poll resolves). */
  readonly status: BackendStatus | null;
  /** Error message from the last poll, if any. */
  readonly error: string | null;
  /** Human-readable activity message derived from status. */
  readonly message: string;
  /** Status color for UI badging. */
  readonly color: 'green' | 'yellow' | 'red' | 'gray';
  /** Manually refresh the backend status. */
  readonly refresh: () => Promise<BackendStatus | null>;
} {
  const status = useBackendStatusStore((state) => state.backendStatus);
  const error = useBackendStatusStore((state) => state.backendError);
  const refresh = useBackendStatusStore((state) => state.refresh);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    void refreshRef.current();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void refreshRef.current();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return {
    status,
    error,
    message: getBackendActivityMessage(status),
    color: getBackendStatusColor(status),
    refresh,
  };
}
