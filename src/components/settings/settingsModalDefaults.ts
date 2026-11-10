/**
 * @file Default values, tier configuration, and draft state types for the settings modal.
 * @module components/settings/settingsModalDefaults.ts
 */
// Defaults, tier configs and state types for the settings modal hook
// (extracted from useSettingsModal.ts).
import type { PerformanceTier } from '@/lib/performance-detector';
import type {
  GenerationSettings,
  KeyboardSettings,
  PerformanceSettings,
  PrivacySettings,
  StyleSettings,
  TTSSettings,
  TranscriptionSettings,
} from '@/lib/settings-types';
import type { Dispatch, SetStateAction } from 'react';
/**
 * Performance tier configurations (low / medium / high).
 *
 * Maps each {@link PerformanceTier} to the partial {@link PerformanceSettings}
 * applied when that tier is selected or auto-detected.
 */
export const TIER_CONFIGS: Record<
  PerformanceTier,
  Partial<PerformanceSettings>
> = {
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

/**
 * Default settings for each domain, mirroring the store defaults.
 *
 * Used as the initial draft state in {@link useSettingsModal} and as the
 * merge base when reconciling with persisted store values.
 */
export const DEFAULTS = {
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
    embeddingComputeMode: 'server',
    enableSummaryMemory: true,
    enableConstitutionMiddleware: true,
    enableAppealProcess: true,
  },
  privacy: {
    conversationPersistence: 'local' as const,
    associativeMemoryRemote: false,
  },
};

/**
 * State interfaces for each settings domain.
 *
 * Each interface pairs a settings draft with its domain-specific update
 * helpers, returned by {@link useSettingsModal}.
 */

/** Performance domain state returned by {@link useSettingsModal}. */
export interface PerformanceState {
  settings: PerformanceSettings;
  updateSetting: <K extends keyof PerformanceSettings>(
    key: K,
    value: PerformanceSettings[K]
  ) => void;
  handleTierChange: (tier: PerformanceTier) => void;
  resetPerformance: () => void;
}

/** TTS domain state returned by {@link useSettingsModal}. */
export interface TTSState {
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

/** Transcription domain state returned by {@link useSettingsModal}. */
export interface TranscriptionState {
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

/** Keyboard domain state returned by {@link useSettingsModal}. */
export interface KeyboardState {
  settings: KeyboardSettings;
  updateSetting: Dispatch<SetStateAction<KeyboardSettings>>;
}

/** Style domain state returned by {@link useSettingsModal}. */
export interface StyleState {
  settings: StyleSettings;
  updateSetting: Dispatch<SetStateAction<StyleSettings>>;
}

/** Generation domain state returned by {@link useSettingsModal}. */
export interface GenerationState {
  settings: GenerationSettings;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'error';
  connectionError: string | null;
  updateSetting: Dispatch<SetStateAction<GenerationSettings>>;
  testConnection: () => void;
}

/** Agent domain state returned by {@link useSettingsModal}. */
export interface AgentState {
  settings: Record<string, unknown>;
  updateSetting: Dispatch<SetStateAction<Record<string, unknown>>>;
}

/** Privacy domain state returned by {@link useSettingsModal}. */
export interface PrivacyState {
  settings: PrivacySettings;
  updateSetting: Dispatch<SetStateAction<PrivacySettings>>;
}

/** Aggregate return type of {@link useSettingsModal}. */
export interface UseSettingsModalReturn {
  performance: PerformanceState;
  tts: TTSState;
  transcription: TranscriptionState;
  keyboard: KeyboardState;
  style: StyleState;
  generation: GenerationState;
  agent: AgentState;
  privacy: PrivacyState;
  meta: {
    detectedTier: PerformanceTier | null;
  };
  actions: {
    save: () => void;
    reset: () => void;
  };
}
