/**
 * @file useInterlocutorChatKeyboard.ts — Keyboard shortcuts (submit, exit terminal, transcription) for chat.
 *
 * @module components/chat/useInterlocutorChatKeyboard
 */

import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { useTranscription } from '@/hooks/useTranscription';
import type { MutableRefObject } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type {
  KeyboardSettings,
  TranscriptionSettings,
} from '@/lib/settings-types';

/** Options for {@link useInterlocutorChatKeyboard}. */
export interface UseInterlocutorChatKeyboardOptions {
  /** Current input text. */
  readonly input: string;
  /** Updates the input text. */
  readonly setInput: (value: string) => void;
  /** Submits a message to the chat transport. */
  readonly handleSubmitMessage: (text: string) => void;
  /** Whether the chat transport is currently loading. */
  readonly isLoading: boolean;
  /** Whether the performance/settings modal is open. */
  readonly showPerformanceSettings: boolean;
  /** Whether waveform/visualization shortcuts are active. */
  readonly waveformEnabled: boolean;
  /** Navigates the active visualization type. */
  readonly navigateToVisualizationType: (
    direction: 'next' | 'prev',
    current: 'waveform' | 'gauge' | 'pie' | 'clock'
  ) => void;
  /** Ref tracking the current visualization type. */
  readonly visualizationTypeRef: MutableRefObject<
    'waveform' | 'gauge' | 'pie' | 'clock'
  >;
  /** Returns keyboard settings from the store. */
  readonly getKeyboardSettings: () => KeyboardSettings | null;
  /** Returns transcription settings from the store. */
  readonly getTranscriptionSettings: () => TranscriptionSettings | null;
}

/** Return value of {@link useInterlocutorChatKeyboard}. */
export interface UseInterlocutorChatKeyboardResult {
  readonly keyboardEnabled: boolean;
  readonly exitTerminalKey: string;
  readonly transcription: ReturnType<typeof useTranscription>;
  readonly isInputFocusedRef: MutableRefObject<boolean>;
}

/**
 * Registers chat keyboard shortcuts and returns transcription/shortcut state.
 *
 * @param options - Keyboard hook options.
 * @returns Keyboard and transcription state.
 */
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
}: UseInterlocutorChatKeyboardOptions): UseInterlocutorChatKeyboardResult => {
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
