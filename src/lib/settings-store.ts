/**
 * @file Zustand settings store with persistence and sectioned getters, savers, and updaters.
 * @module lib/settings-store.ts
 */
// Settings state management with Zustand
//
// Best practices for consuming this store:
// - For primitive selectors (strings, numbers): use directly, e.g. useSettingsStore(state => state.settings?.style?.mode)
// - For object selectors: wrap with useShallow to prevent re-renders when values haven't changed:
//     import { useShallow } from 'zustand/react/shallow'
//     useSettingsStore(useShallow(state => state.settings?.performance))
// - For function selectors (actions): use directly, they're stable references
// - For one-time reads without subscription: use useSettingsStore.getState()
// - For manual subscriptions with object comparison: use shallow from 'zustand/shallow'

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BackgroundSettings,
  GenerationSettings,
  KeyboardSettings,
  PerformanceSettings,
  StyleSettings,
  TTSSettings,
  TranscriptionSettings,
  UserSettings,
  WaveformLayer,
  WaveformSettings,
} from './settings-types';

interface SettingsStore {
  settings: UserSettings;

  // Actions
  getSettings: () => UserSettings;
  saveSettings: (settings: UserSettings) => void;
  getTTSSettings: () => TTSSettings | null;
  saveTTSSettings: (ttsSettings: TTSSettings) => void;
  updateTTSSettings: (updates: Partial<TTSSettings>) => TTSSettings;
  updatePreferences: (preferences: UserSettings['preferences']) => void;
  getWaveformEnabled: () => boolean;
  saveWaveformEnabled: (enabled: boolean) => void;
  getWaveformSettings: () => WaveformSettings | null;
  saveWaveformSettings: (settings: WaveformSettings) => void;
  getWaveformLayers: () => WaveformLayer[];
  saveWaveformLayers: (layers: WaveformLayer[]) => void;
  getBackgroundSettings: () => BackgroundSettings | null;
  saveBackgroundSettings: (settings: BackgroundSettings) => void;
  getPerformanceSettings: () => PerformanceSettings | null;
  savePerformanceSettings: (settings: PerformanceSettings) => void;
  updatePerformanceSettings: (
    updates: Partial<PerformanceSettings>
  ) => PerformanceSettings;
  getTranscriptionSettings: () => TranscriptionSettings | null;
  saveTranscriptionSettings: (settings: TranscriptionSettings) => void;
  updateTranscriptionSettings: (
    updates: Partial<TranscriptionSettings>
  ) => TranscriptionSettings;
  getKeyboardSettings: () => KeyboardSettings | null;
  saveKeyboardSettings: (settings: KeyboardSettings) => void;
  updateKeyboardSettings: (
    updates: Partial<KeyboardSettings>
  ) => KeyboardSettings;
  getStyleSettings: () => StyleSettings | null;
  saveStyleSettings: (settings: StyleSettings) => void;
  updateStyleSettings: (updates: Partial<StyleSettings>) => StyleSettings;
  getGenerationSettings: () => GenerationSettings | null;
  saveGenerationSettings: (settings: GenerationSettings) => void;
  updateGenerationSettings: (
    updates: Partial<GenerationSettings>
  ) => GenerationSettings;
  resetSettings: () => void;
}

const DEFAULT_TTS_SETTINGS: TTSSettings = {
  provider: 'kokoro',
  kokoro: {
    defaultVoice: 'af_heart',
    speakingRate: 1.0,
  },
};

const DEFAULT_TRANSCRIPTION_SETTINGS: TranscriptionSettings = {
  provider: 'openai',
  language: undefined,
  modelId: 'whisper-1',
  timestampGranularities: ['segment'],
  task: 'transcribe',
  openai: {
    modelId: 'whisper-1',
    timestampGranularities: ['segment'],
  },
  local: {
    modelId: 'Xenova/whisper-base',
    quantized: true,
    task: 'transcribe',
  },
};

const DEFAULT_KEYBOARD_SETTINGS: KeyboardSettings = {
  transcriptionKey: '`',
  submitKeypress: 'shift+enter',
  enabled: true,
  prevVisualizationKey: ',',
  nextVisualizationKey: '.',
  exitTerminalKey: 'ctrl+shift+e',
};

const DEFAULT_SETTINGS: UserSettings = {
  sessionId: 'default',
  tts: DEFAULT_TTS_SETTINGS,
  transcription: DEFAULT_TRANSCRIPTION_SETTINGS,
  preferences: {
    theme: 'auto',
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      getSettings: () => {
        const state = get();
        return state.settings || DEFAULT_SETTINGS;
      },

      saveSettings: (settings) => {
        set({
          settings: {
            ...settings,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      getTTSSettings: () => {
        const state = get();
        return state.settings?.tts || null;
      },

      saveTTSSettings: (ttsSettings) => {
        const current = get().settings;

        set({
          settings: {
            ...current,
            tts: ttsSettings,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateTTSSettings: (updates) => {
        const current = get().settings;
        const existing = current?.tts || DEFAULT_TTS_SETTINGS;
        const merged: TTSSettings = {
          ...existing,
          ...updates,
          provider: updates.provider || existing.provider || 'kokoro',
          // Deep merge provider-specific settings
          kokoro: {
            ...existing.kokoro,
            ...updates.kokoro,
          },
          xtts: {
            ...existing.xtts,
            ...updates.xtts,
          },
          ttsWebUI: {
            ...existing.ttsWebUI,
            ...updates.ttsWebUI,
          },
          elevenLabs: {
            ...existing.elevenLabs,
            ...updates.elevenLabs,
          },
          vercelAI: {
            ...existing.vercelAI,
            ...updates.vercelAI,
          },
          browser: {
            ...existing.browser,
            ...updates.browser,
          },
        };

        set({
          settings: {
            ...current,
            tts: merged,
            updatedAt: new Date().toISOString(),
          },
        });

        return merged;
      },

      updatePreferences: (preferences) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            preferences: {
              ...current.preferences,
              ...preferences,
            },
            updatedAt: new Date().toISOString(),
          },
        });
      },

      getWaveformEnabled: () => {
        const state = get();
        return state.settings?.waveform?.enabled ?? true; // Default to true if not set
      },

      saveWaveformEnabled: (enabled) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            waveform: {
              ...(current.waveform || {}),
              enabled,
            },
            updatedAt: new Date().toISOString(),
          },
        });
      },

      getWaveformSettings: () => {
        const state = get();
        return state.settings?.waveform?.settings || null;
      },

      saveWaveformSettings: (settings) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            waveform: {
              ...(current.waveform || {}),
              settings,
            },
            updatedAt: new Date().toISOString(),
          },
        });
      },

      getWaveformLayers: () => {
        const state = get();
        return state.settings?.waveform?.layers || [];
      },

      saveWaveformLayers: (layers) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            waveform: {
              ...(current.waveform || {}),
              layers,
            },
            updatedAt: new Date().toISOString(),
          },
        });
      },

      getBackgroundSettings: () => {
        const state = get();
        return state.settings?.background || null;
      },

      saveBackgroundSettings: (settings) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            background: settings,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      getPerformanceSettings: () => {
        const state = get();
        return state.settings?.performance || null;
      },

      savePerformanceSettings: (settings) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            performance: settings,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updatePerformanceSettings: (updates) => {
        const current = get().settings;
        const existing = current?.performance || null;
        const merged: PerformanceSettings = {
          ...existing,
          ...updates,
        } as PerformanceSettings;

        set({
          settings: {
            ...current,
            performance: merged,
            updatedAt: new Date().toISOString(),
          },
        });

        return merged;
      },

      getTranscriptionSettings: () => {
        const state = get();
        return state.settings?.transcription || null;
      },

      saveTranscriptionSettings: (settings) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            transcription: settings,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateTranscriptionSettings: (updates) => {
        const current = get().settings;
        const existing =
          current?.transcription || DEFAULT_TRANSCRIPTION_SETTINGS;
        const merged: TranscriptionSettings = {
          ...existing,
          ...updates,
          provider: updates.provider || existing.provider || 'openai',
          openai: {
            ...existing.openai,
            ...updates.openai,
          },
          local: {
            ...existing.local,
            ...updates.local,
          },
        };

        set({
          settings: {
            ...current,
            transcription: merged,
            updatedAt: new Date().toISOString(),
          },
        });

        return merged;
      },

      getKeyboardSettings: () => {
        const state = get();
        return state.settings?.keyboard || null;
      },

      saveKeyboardSettings: (settings) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            keyboard: settings,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateKeyboardSettings: (updates) => {
        const current = get().settings;
        const existing = current?.keyboard || DEFAULT_KEYBOARD_SETTINGS;
        const merged: KeyboardSettings = {
          ...existing,
          ...updates,
        };

        set({
          settings: {
            ...current,
            keyboard: merged,
            updatedAt: new Date().toISOString(),
          },
        });

        return merged;
      },

      getStyleSettings: () => {
        const state = get();
        return state.settings?.style || null;
      },

      saveStyleSettings: (settings) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            style: settings,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateStyleSettings: (updates) => {
        const current = get().settings;
        const existing = current?.style || {};
        const merged: StyleSettings = {
          ...existing,
          ...updates,
        };

        set({
          settings: {
            ...current,
            style: merged,
            updatedAt: new Date().toISOString(),
          },
        });

        return merged;
      },

      getGenerationSettings: () => {
        const state = get();
        return state.settings?.generation || null;
      },

      saveGenerationSettings: (settings) => {
        const current = get().settings;
        set({
          settings: {
            ...current,
            generation: settings,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateGenerationSettings: (updates) => {
        const current = get().settings;
        const existing = current?.generation || {};
        const merged: GenerationSettings = {
          ...existing,
          ...updates,
        };

        set({
          settings: {
            ...current,
            generation: merged,
            updatedAt: new Date().toISOString(),
          },
        });

        return merged;
      },

      resetSettings: () => {
        set({
          settings: DEFAULT_SETTINGS,
        });
      },
    }),
    {
      name: 'innerview-settings',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
