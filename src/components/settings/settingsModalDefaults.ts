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
  StyleSettings,
  TTSSettings,
  TranscriptionSettings,
} from '@/lib/settings-types';
import type { Dispatch, SetStateAction } from 'react';
// Performance tier configurations
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

// Default settings (matching store defaults)
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
    enableSummaryMemory: true,
    enableConstitutionMiddleware: true,
    enableAppealProcess: true,
  },
};

// State interfaces for each domain
export interface PerformanceState {
  settings: PerformanceSettings;
  updateSetting: <K extends keyof PerformanceSettings>(
    key: K,
    value: PerformanceSettings[K]
  ) => void;
  handleTierChange: (tier: PerformanceTier) => void;
  resetPerformance: () => void;
}

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

export interface KeyboardState {
  settings: KeyboardSettings;
  updateSetting: Dispatch<SetStateAction<KeyboardSettings>>;
}

export interface StyleState {
  settings: StyleSettings;
  updateSetting: Dispatch<SetStateAction<StyleSettings>>;
}

export interface GenerationState {
  settings: GenerationSettings;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'error';
  connectionError: string | null;
  updateSetting: Dispatch<SetStateAction<GenerationSettings>>;
  testConnection: () => void;
}

export interface AgentState {
  settings: Record<string, unknown>;
  updateSetting: Dispatch<SetStateAction<Record<string, unknown>>>;
}

export interface UseSettingsModalReturn {
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
