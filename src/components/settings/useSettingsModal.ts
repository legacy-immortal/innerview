/**
 * @file Hook holding settings modal draft state, persistence, and connection testing.
 * @module components/settings/useSettingsModal.ts
 */
import { detectPerformanceCached } from '@/lib/performance-detector';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { useGenerationConnection } from '@/hooks/useGenerationConnection';
import { useSettingsUpdaters } from '@/hooks/useSettingsUpdaters';
import {
  DEFAULTS,
  type AgentState,
  type GenerationState,
  type KeyboardState,
  type PerformanceState,
  type StyleState,
  type TranscriptionState,
  type TTSState,
  type UseSettingsModalReturn,
} from './settingsModalDefaults';

export type {
  AgentState,
  GenerationState,
  KeyboardState,
  PerformanceState,
  StyleState,
  TranscriptionState,
  TTSState,
  UseSettingsModalReturn,
} from './settingsModalDefaults';

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

  const [detectedTier, setDetectedTier] =
    useState<UseSettingsModalReturn['meta']['detectedTier']>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>(
    []
  );
  const { connectionStatus, connectionError, testConnection } =
    useGenerationConnection(setGenerationSettings);

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

  const {
    updatePerformanceSetting,
    changePerformanceTier,
    resetPerformance,
    updateTTSSetting,
    updateTTSKokoro,
    updateTTSBrowser,
    updateTranscriptionSetting,
    updateTranscriptionOpenAI,
    updateTranscriptionLocal,
  } = useSettingsUpdaters(
    setPerformanceSettings,
    setTtsSettings,
    setTranscriptionSettings
  );

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
