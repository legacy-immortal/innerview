// Provider connection test for the generation settings (extracted from useSettingsModal.ts).
import { ZEN_BASE_URL, ZEN_FREE_MODEL_IDS } from '@/lib/constants';
import type { GenerationSettings } from '@/lib/settings-types';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';

export type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';

export function useGenerationConnection(
  setGenerationSettings: Dispatch<SetStateAction<GenerationSettings>>
) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

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
            const response = await fetch('/api/provider/test', {
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

  return { connectionStatus, connectionError, testConnection };
}
