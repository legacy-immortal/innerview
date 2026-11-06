import { ZEN_BASE_URL, ZEN_FREE_MODEL_IDS } from '@/lib/constants';
import {
  detectPerformanceCached,
  generatePerformanceSettings,
  type PerformanceTier,
} from '@/lib/performance-detector';
import { useSettingsStore } from '@/lib/settings-store';
import type {
  GenerationSettings,
  KeyboardSettings,
  PerformanceSettings,
  StyleSettings,
  TTSSettings,
  TranscriptionSettings,
} from '@/lib/settings-types';
import { getAvailableVoices } from '@/lib/tts/browser/browser-config';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';

// Performance tier configurations
const TIER_CONFIGS: Record<PerformanceTier, Partial<PerformanceSettings>> = {
  low: {
    animationsEnabled: false,
    backgroundAnimationsEnabled: false,
    reducedMotion: true,
    lowPowerMode: true,
    maxParticles: 0,
    maxBackgroundComplexity: 'minimal',
    chakraAnimationsEnabled: false,
  },
  medium: {
    animationsEnabled: true,
    backgroundAnimationsEnabled: true,
    reducedMotion: false,
    lowPowerMode: false,
    maxParticles: 25,
    maxBackgroundComplexity: 'simple',
    chakraAnimationsEnabled: true,
  },
  high: {
    animationsEnabled: true,
    backgroundAnimationsEnabled: true,
    reducedMotion: false,
    lowPowerMode: false,
    maxParticles: 100,
    maxBackgroundComplexity: 'full',
    chakraAnimationsEnabled: true,
  },
};

// Default settings (matching store defaults)
const DEFAULTS = {
  performance: {
    animationsEnabled: true,
    backgroundAnimationsEnabled: true,
    reducedMotion: false,
    lowPowerMode: false,
    maxParticles: 50,
    maxBackgroundComplexity: 'normal' as const,
    chakraAnimationsEnabled: true,
    virtualScrollingEnabled: true,
    autoDetected: false,
    tier: 'medium' as const,
  },
  tts: {
    provider: 'kokoro' as const,
    kokoro: {
      defaultVoice: 'af_heart',
      speakingRate: 1.0,
    },
  },
  transcription: {
    provider: 'openai' as const,
    modelId: 'whisper-1',
    timestampGranularities: ['segment'],
    task: 'transcribe' as const,
    openai: {
      modelId: 'whisper-1',
      timestampGranularities: ['segment'],
    },
    local: {
      modelId: 'Xenova/whisper-base',
      quantized: true,
      task: 'transcribe' as const,
    },
  },
  keyboard: {
    transcriptionKey: '`',
    submitKeypress: 'shift+enter',
    enabled: true,
    prevVisualizationKey: ',',
    nextVisualizationKey: '.',
    exitTerminalKey: 'ctrl+shift+e',
  },
  style: {
    sidebarBackgroundColor: 'transparent',
  },
  generation: {
    baseURL: 'https://api.openai.com/v1',
    temperature: 0.8,
    maxTokens: 512,
    topP: 1.0,
    topK: undefined,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    stopSequences: [],
    seed: undefined,
    modelName: 'gpt-5',
    availableModels: [],
    reasoningTag: 'thinking',
    enableAssociativeMemory: true,
    enableSummaryMemory: true,
    enableConstitutionMiddleware: true,
    enableAppealProcess: true,
  },
};

// State interfaces for each domain
interface PerformanceState {
  settings: PerformanceSettings;
  updateSetting: <K extends keyof PerformanceSettings>(
    key: K,
    value: PerformanceSettings[K]
  ) => void;
  handleTierChange: (tier: PerformanceTier) => void;
  resetPerformance: () => void;
}

interface TTSState {
  settings: TTSSettings;
  browserVoices: SpeechSynthesisVoice[];
  updateSetting: <K extends keyof TTSSettings>(
    key: K,
    value: TTSSettings[K]
  ) => void;
  updateKokoro: <K extends keyof NonNullable<TTSSettings['kokoro']>>(
    key: K,
    value: NonNullable<TTSSettings['kokoro']>[K]
  ) => void;
  updateBrowser: <K extends keyof NonNullable<TTSSettings['browser']>>(
    key: K,
    value: NonNullable<TTSSettings['browser']>[K]
  ) => void;
}

interface TranscriptionState {
  settings: TranscriptionSettings;
  updateSetting: <K extends keyof TranscriptionSettings>(
    key: K,
    value: TranscriptionSettings[K]
  ) => void;
  updateOpenAI: <K extends keyof NonNullable<TranscriptionSettings['openai']>>(
    key: K,
    value: NonNullable<TranscriptionSettings['openai']>[K]
  ) => void;
  updateLocal: <K extends keyof NonNullable<TranscriptionSettings['local']>>(
    key: K,
    value: NonNullable<TranscriptionSettings['local']>[K]
  ) => void;
}

interface KeyboardState {
  settings: KeyboardSettings;
  updateSetting: Dispatch<SetStateAction<KeyboardSettings>>;
}

interface StyleState {
  settings: StyleSettings;
  updateSetting: Dispatch<SetStateAction<StyleSettings>>;
}

interface GenerationState {
  settings: GenerationSettings;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'error';
  connectionError: string | null;
  updateSetting: Dispatch<SetStateAction<GenerationSettings>>;
  testConnection: () => void;
}

interface AgentState {
  settings: Record<string, unknown>;
  updateSetting: Dispatch<SetStateAction<Record<string, unknown>>>;
}

interface UseSettingsModalReturn {
  performance: PerformanceState;
  tts: TTSState;
  transcription: TranscriptionState;
  keyboard: KeyboardState;
  style: StyleState;
  generation: GenerationState;
  agent: AgentState;
  meta: {
    detectedTier: PerformanceTier | null;
  };
  actions: {
    save: () => void;
    reset: () => void;
  };
}

export function useSettingsModal(isOpen: boolean): UseSettingsModalReturn {
  // Local editing state (store read only in effect when modal opens to avoid re-renders on store changes)
  const [performanceSettings, setPerformanceSettings] =
    useState<PerformanceSettings>(DEFAULTS.performance);
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>(DEFAULTS.tts);
  const [transcriptionSettings, setTranscriptionSettings] =
    useState<TranscriptionSettings>(
      DEFAULTS.transcription as TranscriptionSettings
    );
  const [keyboardSettings, setKeyboardSettings] = useState<KeyboardSettings>(
    DEFAULTS.keyboard
  );
  const [styleSettings, setStyleSettings] = useState<StyleSettings>(
    DEFAULTS.style
  );
  const [generationSettings, setGenerationSettings] =
    useState<GenerationSettings>(DEFAULTS.generation as GenerationSettings);
  const [agentSettings, setAgentSettings] = useState<Record<string, unknown>>(
    {}
  );

  const [detectedTier, setDetectedTier] = useState<PerformanceTier | null>(
    null
  );
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>(
    []
  );
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'connected' | 'error'
  >('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Initialize from store when modal opens and subscribe to changes
  useEffect(() => {
    if (!isOpen) return;

    const storeSettings = useSettingsStore.getState().settings;
    if (storeSettings?.performance) {
      setPerformanceSettings(storeSettings.performance);
    }
    if (storeSettings?.tts) {
      setTtsSettings(storeSettings.tts);
    }
    if (storeSettings?.transcription) {
      setTranscriptionSettings(storeSettings.transcription);
    }
    if (storeSettings?.keyboard) {
      setKeyboardSettings(storeSettings.keyboard);
    }
    if (storeSettings?.style) {
      setStyleSettings(storeSettings.style);
    }
    if (storeSettings?.generation) {
      setGenerationSettings({
        ...DEFAULTS.generation,
        ...storeSettings.generation,
      });
    }

    // Load browser voices
    const loadVoices = () => setBrowserVoices(getAvailableVoices());
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Detect performance tier
    detectPerformanceCached().then((metrics) => setDetectedTier(metrics.tier));

    // Subscribe to store changes for reactive sync using Zustand's shallow comparison
    // This prevents unnecessary local state updates when values haven't actually changed
    const unsubscribe = useSettingsStore.subscribe((state) => {
      const current = state.settings;
      if (!current) return;

      if (current.performance) {
        const perf = current.performance;
        setPerformanceSettings((prev) => (shallow(perf, prev) ? prev : perf));
      }
      if (current.tts) {
        const tts = current.tts;
        setTtsSettings((prev) => (shallow(tts, prev) ? prev : tts));
      }
      if (current.transcription) {
        const trans = current.transcription;
        setTranscriptionSettings((prev) =>
          shallow(trans, prev) ? prev : trans
        );
      }
      if (current.keyboard) {
        const kb = current.keyboard;
        setKeyboardSettings((prev) => (shallow(kb, prev) ? prev : kb));
      }
      if (current.style) {
        const style = current.style;
        setStyleSettings((prev) => (shallow(style, prev) ? prev : style));
      }
      if (current.generation) {
        const next = {
          ...DEFAULTS.generation,
          ...current.generation,
        } as GenerationSettings;
        setGenerationSettings((prev) => (shallow(next, prev) ? prev : next));
      }
    });

    return unsubscribe;
  }, [isOpen]);

  // Stable update callbacks for performance settings
  const updatePerformanceSetting = useCallback(
    <K extends keyof PerformanceSettings>(
      key: K,
      value: PerformanceSettings[K]
    ) => {
      setPerformanceSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const changePerformanceTier = useCallback((tier: PerformanceTier) => {
    detectPerformanceCached().then((metrics) => {
      const baseSettings = generatePerformanceSettings(metrics);
      const tierConfig = TIER_CONFIGS[tier];
      setPerformanceSettings({
        ...baseSettings,
        ...tierConfig,
        tier,
        autoDetected: false,
      });
    });
  }, []);

  const resetPerformance = useCallback(() => {
    detectPerformanceCached().then((metrics) => {
      const autoSettings = generatePerformanceSettings(metrics);
      setPerformanceSettings({
        ...autoSettings,
        autoDetected: true,
        tier: metrics.tier,
      });
    });
  }, []);

  // Stable update callbacks for TTS settings
  const updateTTSSetting = useCallback(
    <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
      setTtsSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateTTSKokoro = useCallback(
    <K extends keyof NonNullable<TTSSettings['kokoro']>>(
      key: K,
      value: NonNullable<TTSSettings['kokoro']>[K]
    ) => {
      setTtsSettings((prev) => ({
        ...prev,
        kokoro: {
          ...prev.kokoro,
          [key]: value,
        },
      }));
    },
    []
  );

  const updateTTSBrowser = useCallback(
    <K extends keyof NonNullable<TTSSettings['browser']>>(
      key: K,
      value: NonNullable<TTSSettings['browser']>[K]
    ) => {
      setTtsSettings((prev) => ({
        ...prev,
        browser: {
          ...prev.browser,
          [key]: value,
        },
      }));
    },
    []
  );

  // Stable update callbacks for transcription settings
  const updateTranscriptionSetting = useCallback(
    <K extends keyof TranscriptionSettings>(
      key: K,
      value: TranscriptionSettings[K]
    ) => {
      setTranscriptionSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateTranscriptionOpenAI = useCallback(
    <K extends keyof NonNullable<TranscriptionSettings['openai']>>(
      key: K,
      value: NonNullable<TranscriptionSettings['openai']>[K]
    ) => {
      setTranscriptionSettings((prev) => ({
        ...prev,
        openai: {
          ...prev.openai,
          [key]: value,
        },
      }));
    },
    []
  );

  const updateTranscriptionLocal = useCallback(
    <K extends keyof NonNullable<TranscriptionSettings['local']>>(
      key: K,
      value: NonNullable<TranscriptionSettings['local']>[K]
    ) => {
      setTranscriptionSettings((prev) => ({
        ...prev,
        local: {
          ...prev.local,
          [key]: value,
        },
      }));
    },
    []
  );

  // Connection test with stable reference
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
  }, []);

  // Save all settings
  const saveAll = useCallback(() => {
    const store = useSettingsStore.getState();
    store.savePerformanceSettings(performanceSettings);
    store.saveTTSSettings(ttsSettings);
    store.saveTranscriptionSettings(transcriptionSettings);
    store.saveKeyboardSettings(keyboardSettings);
    store.saveStyleSettings(styleSettings);
    store.saveGenerationSettings(generationSettings);
  }, [
    performanceSettings,
    ttsSettings,
    transcriptionSettings,
    keyboardSettings,
    styleSettings,
    generationSettings,
  ]);

  // Memoized state objects - split by domain to prevent cross-contamination
  const performanceState = useMemo<PerformanceState>(
    () => ({
      settings: performanceSettings,
      updateSetting: updatePerformanceSetting,
      handleTierChange: changePerformanceTier,
      resetPerformance,
    }),
    [
      performanceSettings,
      updatePerformanceSetting,
      changePerformanceTier,
      resetPerformance,
    ]
  );

  const ttsState = useMemo<TTSState>(
    () => ({
      settings: ttsSettings,
      browserVoices,
      updateSetting: updateTTSSetting,
      updateKokoro: updateTTSKokoro,
      updateBrowser: updateTTSBrowser,
    }),
    [
      ttsSettings,
      browserVoices,
      updateTTSSetting,
      updateTTSKokoro,
      updateTTSBrowser,
    ]
  );

  const transcriptionState = useMemo<TranscriptionState>(
    () => ({
      settings: transcriptionSettings,
      updateSetting: updateTranscriptionSetting,
      updateOpenAI: updateTranscriptionOpenAI,
      updateLocal: updateTranscriptionLocal,
    }),
    [
      transcriptionSettings,
      updateTranscriptionSetting,
      updateTranscriptionOpenAI,
      updateTranscriptionLocal,
    ]
  );

  const keyboardState = useMemo<KeyboardState>(
    () => ({
      settings: keyboardSettings,
      updateSetting: setKeyboardSettings,
    }),
    [keyboardSettings]
  );

  const styleState = useMemo<StyleState>(
    () => ({
      settings: styleSettings,
      updateSetting: setStyleSettings,
    }),
    [styleSettings]
  );

  const generationState = useMemo<GenerationState>(
    () => ({
      settings: generationSettings,
      connectionStatus,
      connectionError,
      updateSetting: setGenerationSettings,
      testConnection,
    }),
    [generationSettings, connectionStatus, connectionError, testConnection]
  );

  const agentState = useMemo<AgentState>(
    () => ({
      settings: agentSettings,
      updateSetting: setAgentSettings,
    }),
    [agentSettings]
  );

  return {
    performance: performanceState,
    tts: ttsState,
    transcription: transcriptionState,
    keyboard: keyboardState,
    style: styleState,
    generation: generationState,
    agent: agentState,
    meta: { detectedTier },
    actions: { save: saveAll, reset: resetPerformance },
  };
}
