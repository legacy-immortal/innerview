// Provider status store - tracks AI provider availability
import { create } from 'zustand';

export type ProviderStatus = {
  status: 'unknown' | 'checking' | 'available' | 'unavailable' | 'error';
  provider?: 'local' | 'remote';
  baseURL?: string;
  error?: string;
  suggestion?: string;
  modelsAvailable?: number;
  models?: string[];
  lastChecked?: Date;
};

interface ProviderStatusStore {
  providerStatus: ProviderStatus;
  setProviderStatus: (status: ProviderStatus) => void;
  checkProvider: () => Promise<ProviderStatus>;
  clearCache: () => void;
}

export const useProviderStatusStore = create<ProviderStatusStore>(
  (set, get) => ({
    providerStatus: { status: 'unknown' },

    setProviderStatus: (status) => set({ providerStatus: status }),

    clearCache: () => set({ providerStatus: { status: 'unknown' } }),

    checkProvider: async () => {
      const current = get().providerStatus;

      // Skip if already checking
      if (current.status === 'checking') {
        return current;
      }

      // Use cached result if less than 30 seconds old
      if (
        current.lastChecked &&
        Date.now() - current.lastChecked.getTime() < 30000 &&
        current.status !== 'unknown'
      ) {
        return current;
      }

      set({ providerStatus: { status: 'checking' } });

      try {
        const response = await fetch('/api/provider/status', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorStatus: ProviderStatus = {
            status: 'error',
            error: `Backend returned ${response.status}`,
            suggestion: 'Check if the backend server is running on port 3001',
            lastChecked: new Date(),
          };
          set({ providerStatus: errorStatus });
          return errorStatus;
        }

        const data = await response.json();

        const newStatus: ProviderStatus = {
          status: data.status === 'available' ? 'available' : 'unavailable',
          provider: data.provider,
          baseURL: data.baseURL,
          error: data.error,
          suggestion: data.suggestion,
          modelsAvailable: data.modelsAvailable,
          models: data.models,
          lastChecked: new Date(),
        };

        set({ providerStatus: newStatus });
        return newStatus;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Check if it's a network error (backend not running)
        const isNetworkError =
          errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('Failed');

        const errorStatus: ProviderStatus = {
          status: 'error',
          error: isNetworkError
            ? 'Cannot connect to backend server'
            : errorMessage,
          suggestion: isNetworkError
            ? 'Make sure the backend is running with: bun run dev'
            : 'Check the console for more details',
          lastChecked: new Date(),
        };

        set({ providerStatus: errorStatus });
        return errorStatus;
      }
    },
  })
);

// Helper to get a human-readable status message
export function getProviderStatusMessage(status: ProviderStatus): string {
  switch (status.status) {
    case 'unknown':
      return 'Provider status unknown';
    case 'checking':
      return 'Checking provider...';
    case 'available':
      return status.modelsAvailable
        ? `Connected (${status.modelsAvailable} models)`
        : 'Connected';
    case 'unavailable':
      return status.error || 'Provider unavailable';
    case 'error':
      return status.error || 'Error checking provider';
    default:
      return 'Unknown status';
  }
}

// Helper to get status color
export function getProviderStatusColor(
  status: ProviderStatus
): 'green' | 'yellow' | 'red' | 'gray' {
  switch (status.status) {
    case 'available':
      return 'green';
    case 'checking':
      return 'yellow';
    case 'unavailable':
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}
