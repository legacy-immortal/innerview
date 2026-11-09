/**
 * useInterlocutorChatKeyboard.ts — Keyboard shortcuts (submit, exit terminal, transcription) for chat.
 *
 * @module components/chat/useInterlocutorChatKeyboar
 */

import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { useTranscription } from '@/hooks/useTranscription';
import { useHotkeys } from 'react-hotkeys-hook';
import type { MutableRefObject } from 'react';

interface UseInterlocutorChatKeyboardOptions {
  readonly input: string;
  readonly setInput: (value: string) => void;
  readonly handleSubmitMessage: (text: string) => void;
  readonly isLoading: boolean;
  readonly showPerformanceSettings: boolean;
  readonly waveformEnabled: boolean;
  readonly navigateToVisualizationType: (
    direction: 'next' | 'prev',
    current: 'waveform' | 'gauge' | 'pie' | 'clock'
  ) => void;
  readonly visualizationTypeRef: MutableRefObject<
    'waveform' | 'gauge' | 'pie' | 'clock'
  >;
  readonly getKeyboardSettings: () =>
    import('@/lib/settings-types').KeyboardSettings | null;
  readonly getTranscriptionSettings: () =>
    import('@/lib/settings-types').TranscriptionSettings | null;
}

export const useInterlocutorChatKeyboard = ({
  input,
  setInput,
  handleSubmitMessage,
  isLoading,
  showPerformanceSettings,
  waveformEnabled,
  navigateToVisualizationType,
  visualizationTypeRef,
  getKeyboardSettings,
  getTranscriptionSettings,
}: UseInterlocutorChatKeyboardOptions) => {
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  const keyboardSettings = getKeyboardSettings();
  const transcriptionKey = keyboardSettings?.transcriptionKey || '`';
  const keyboardEnabled = keyboardSettings?.enabled !== false;
  const submitKeypress = keyboardSettings?.submitKeypress || 'shift+enter';
  const prevVisualizationKey = keyboardSettings?.prevVisualizationKey ?? ',';
  const nextVisualizationKey = keyboardSettings?.nextVisualizationKey ?? '.';
  const exitTerminalKey = keyboardSettings?.exitTerminalKey ?? 'ctrl+shift+e';

  // Transcription settings from user preferences
  const transcriptionSettings = getTranscriptionSettings();
  const transcriptionProvider = transcriptionSettings?.provider || 'openai';

  // Push-to-talk keyboard handling is done by useGlobalKeyboardShortcuts below,
  // so we disable the internal handler in useTranscription to avoid conflicts.
  const transcription = useTranscription({
    provider: transcriptionProvider,
    onTranscriptionComplete: (result) => {
      setInput(result?.text ?? '');
    },
    enablePushToTalk: false,
  });

  // Disable transcription push-to-talk while chat is loading or settings modal is open
  // to avoid parallel load on the backend (transcription + LLM competing can cause 503s).
  const { isInputFocusedRef } = useGlobalKeyboardShortcuts({
    onTranscriptionStart: transcription.startRecording,
    onTranscriptionStop: transcription.stopRecording,
    transcriptionKey,
    transcriptionEnabled: !isLoading && !showPerformanceSettings,
    submitKeypress,
    onSubmit: () => {
      if (input.trim()) {
        handleSubmitMessage(input);
      }
    },
    onSubmitWithNewline: () => {
      // Allows newline in input (opposite of submit key)
    },
    enabled: keyboardEnabled && !showPerformanceSettings,
  });

  // Keyboard shortcuts to cycle through visualizations (configurable in settings)
  useHotkeys(
    prevVisualizationKey,
    (event) => {
      if (!keyboardEnabled || !waveformEnabled || isInputFocusedRef.current) {
        return;
      }
      event.preventDefault();
      navigateToVisualizationType('prev', visualizationTypeRef.current);
    },
    {
      preventDefault: true,
      enabled: keyboardEnabled && waveformEnabled && !showPerformanceSettings,
    },
    [
      keyboardEnabled,
      waveformEnabled,
      navigateToVisualizationType,
      prevVisualizationKey,
    ]
  );

  useHotkeys(
    nextVisualizationKey,
    (event) => {
      if (!keyboardEnabled || !waveformEnabled || isInputFocusedRef.current) {
        return;
      }
      event.preventDefault();
      navigateToVisualizationType('next', visualizationTypeRef.current);
    },
    {
      preventDefault: true,
      enabled: keyboardEnabled && waveformEnabled && !showPerformanceSettings,
    },
    [
      keyboardEnabled,
      waveformEnabled,
      navigateToVisualizationType,
      nextVisualizationKey,
    ]
  );

  return {
    keyboardEnabled,
    exitTerminalKey,
    transcription,
    isInputFocusedRef,
  };
};
