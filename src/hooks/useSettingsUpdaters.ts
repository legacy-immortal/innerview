/**
 * @file useSettingsUpdaters.ts — Stable per-domain update callbacks for the settings modal.
 * @module hooks/useSettingsUpdaters
 *
 * Stable per-domain update callbacks for the settings modal (extracted from
 * useSettingsModal.ts). Provides memoized callbacks for updating performance,
 * TTS, and transcription settings, including tier changes and resets that
 * re-detect performance and regenerate settings.
 */
import {
  detectPerformanceCached,
  generatePerformanceSettings,
  type PerformanceTier,
} from '@/lib/performance-detector';
import type {
  PerformanceSettings,
  TranscriptionSettings,
  TTSSettings,
} from '@/lib/settings-types';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { TIER_CONFIGS } from '@/components/settings/settingsModalDefaults';

export function useSettingsUpdaters(
  setPerformanceSettings: Dispatch<SetStateAction<PerformanceSettings>>,
  setTtsSettings: Dispatch<SetStateAction<TTSSettings>>,
  setTranscriptionSettings: Dispatch<SetStateAction<TranscriptionSettings>>
) {
  // Stable update callbacks for performance settings
  const updatePerformanceSetting = useCallback(
    <K extends keyof PerformanceSettings>(
      key: K,
      value: PerformanceSettings[K]
    ) => {
      setPerformanceSettings((prev) => ({ ...prev, [key]: value }));
    },
    [setPerformanceSettings]
  );

  const changePerformanceTier = useCallback(
    (tier: PerformanceTier) => {
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
    },
    [setPerformanceSettings]
  );

  const resetPerformance = useCallback(() => {
    detectPerformanceCached().then((metrics) => {
      const autoSettings = generatePerformanceSettings(metrics);
      setPerformanceSettings({
        ...autoSettings,
        autoDetected: true,
        tier: metrics.tier,
      });
    });
  }, [setPerformanceSettings]);

  // Stable update callbacks for TTS settings
  const updateTTSSetting = useCallback(
    <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
      setTtsSettings((prev) => ({ ...prev, [key]: value }));
    },
    [setTtsSettings]
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
    [setTtsSettings]
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
    [setTtsSettings]
  );

  // Stable update callbacks for transcription settings
  const updateTranscriptionSetting = useCallback(
    <K extends keyof TranscriptionSettings>(
      key: K,
      value: TranscriptionSettings[K]
    ) => {
      setTranscriptionSettings((prev) => ({ ...prev, [key]: value }));
    },
    [setTranscriptionSettings]
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
    [setTranscriptionSettings]
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
    [setTranscriptionSettings]
  );

  return {
    /** Set a single performance setting key (stable callback). */
    updatePerformanceSetting,
    /** Change performance tier: re-detects metrics and merges tier config. */
    changePerformanceTier,
    /** Reset performance settings to auto-detected values. */
    resetPerformance,
    /** Set a single TTS setting key (stable callback). */
    updateTTSSetting,
    /** Update a key within TTS kokoro settings. */
    updateTTSKokoro,
    /** Update a key within TTS browser settings. */
    updateTTSBrowser,
    /** Set a single transcription setting key (stable callback). */
    updateTranscriptionSetting,
    /** Update a key within transcription openai settings. */
    updateTranscriptionOpenAI,
    /** Update a key within transcription local settings. */
    updateTranscriptionLocal,
  };
}
