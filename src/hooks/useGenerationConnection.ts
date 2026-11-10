/**
 * @file useGenerationConnection.ts — Provider connection test for generation settings.
 * @module hooks/useGenerationConnection
 *
 * Provider connection test for the generation settings (extracted from
 * useSettingsModal.ts). Tests connectivity to an OpenAI-compatible or Zen
 * generation endpoint, discovers available models, and exposes connection
 * status plus error state to the settings UI.
 */
import { apiUrl } from '@/lib/api-base';
import { ZEN_BASE_URL, ZEN_FREE_MODEL_IDS } from '@/lib/constants';
import type { GenerationSettings } from '@/lib/settings-types';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';

/** Connection lifecycle status for the generation endpoint test. */
export type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';

/**
 * Provider connection test for the generation settings.
 * Tests connectivity to an OpenAI-compatible or Zen generation endpoint,
 * discovers available models, and updates the generation settings store.
 * @param setGenerationSettings - Store setter for generation settings.
 * @returns Connection status, error message, and the testConnection action.
 * @example
 * ```tsx
 * const { connectionStatus, connectionError, testConnection } =
 *   useGenerationConnection(setGenerationSettings);
 * ```
 */
export function useGenerationConnection(
  setGenerationSettings: Dispatch<SetStateAction<GenerationSettings>>
) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  /**
   * Test connectivity to the configured generation endpoint and discover
   * available models. For Zen endpoints it calls POST /api/provider/test;
   * for other OpenAI-compatible endpoints it GETs /v1/models with the
   * optional bearer token. Results are written into the generation settings
   * store (baseURL, availableModels) and connection status/error state.
   * @returns A promise that resolves once the test settles (status is set
   * to 'connected' or 'error').
   */
  const testConnection = useCallback(async () => {
    setGenerationSettings((current) => {
      const { baseURL: rawURL } = current;
      if (!rawURL) {
        setConnectionStatus('error');
        setConnectionError('Base URL is required');
        return current;
      }

      setConnectionStatus('testing');
      setConnectionError(null);

      (async () => {
        try {
          let baseURL = rawURL.trim().replace(/\/+$/, '');
          if (!baseURL.endsWith('/v1')) baseURL += '/v1';
          const isZen =
            baseURL.replace(/\/+$/, '') === ZEN_BASE_URL.replace(/\/+$/, '');

          let models: string[];
          if (isZen) {
            const response = await fetch(apiUrl('/api/provider/test'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ baseURL }),
            });
            const data = (await response.json()) as {
              ok?: boolean;
              models?: string[];
              error?: string;
            };
            if (!data.ok || !data.models) {
              throw new Error(data.error ?? 'Connection failed');
            }
            models =
              data.models.length > 0 ? data.models : [...ZEN_FREE_MODEL_IDS];
          } else {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (current.apiKey?.trim()) {
              headers.Authorization = `Bearer ${current.apiKey.trim()}`;
            }
            const response = await fetch(`${baseURL}/models`, {
              method: 'GET',
              headers,
            });
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
            const data = await response.json();
            const list = Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : Array.isArray(
                      (data as { models?: { id?: string }[] })?.models
                    )
                  ? (data as { models: { id?: string }[] }).models
                  : [];
            models = [];
            list.forEach((m: { id?: string }) => {
              if (m?.id) models.push(m.id);
            });
            if (models.length === 0)
              throw new Error('No models found in API response');
          }

          setGenerationSettings((prev) => ({
            ...prev,
            baseURL,
            availableModels: models,
          }));

          setConnectionStatus('connected');
          setConnectionError(null);
        } catch (error) {
          setConnectionStatus('error');
          setConnectionError(
            error instanceof Error ? error.message : 'Connection failed'
          );
          setGenerationSettings((prev) => ({ ...prev, availableModels: [] }));
        }
      })();

      return current;
    });
  }, [setGenerationSettings]);

  /**
   * Current connection status ('idle' | 'testing' | 'connected' | 'error'),
   * any error message from the last test, and the testConnection action.
   */
  return { connectionStatus, connectionError, testConnection };
}
