/**
 * @file useGlobalKeyboardShortcuts.ts — Global keyboard shortcuts hook for push-to-talk transcription and form submission.
 * @module hooks/useGlobalKeyboardShortcuts
 *
 * Global keyboard shortcuts hook using native event listeners for push-to-talk
 * transcription and react-hotkeys-hook for form submission. Holds the
 * transcription key to record and releases to transcribe (no toggle), ignores
 * input focus and key repeats, and exposes setInputFocused so consumers can
 * suppress shortcuts while typing.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

export interface GlobalKeyboardShortcuts {
  // Transcription push-to-talk
  onTranscriptionStart?: () => void;
  onTranscriptionStop?: () => void;
  transcriptionKey?: string;
  /** When false, push-to-talk does nothing (e.g. while chat is streaming to avoid parallel load). */
  transcriptionEnabled?: boolean;

  // Form submission
  onSubmit?: () => void;
  onSubmitWithNewline?: () => void; // Shift+Enter for newline, Enter for submit
  submitKeypress?: string; // Key combination for submitting (e.g., 'shift+enter', 'enter')

  // Prevent shortcuts when typing in inputs
  enabled?: boolean;
}

// Check if the active element is an input/textarea (i.e., user is typing)
function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    (element as HTMLElement).isContentEditable
  );
}

// Match transcription key: event.key or, for backtick, event.code (Backquote) for layout-independent match
function matchesTranscriptionKey(
  event: KeyboardEvent,
  transcriptionKey: string
): boolean {
  if (event.key === transcriptionKey) return true;
  if (transcriptionKey === '`' && event.code === 'Backquote') return true;
  return false;
}

/**
 * Global keyboard shortcuts hook.
 * Handles transcription push-to-talk (hold-to-record, release-to-transcribe
 * with no toggle) via native keydown/keyup listeners, plus form submission
 * shortcuts via react-hotkeys-hook. Ignores input focus and key repeats so
 * shortcuts don't fire while typing. Consumers call setInputFocused to signal
 * whether an input/textarea is focused.
 * @param options - Shortcut configuration (callbacks, keys, enabled flags).
 * @returns setInputFocused and the input-focus ref.
 * @example
 * ```tsx
 * const { setInputFocused } = useGlobalKeyboardShortcuts({
 *   onTranscriptionStart, onTranscriptionStop, transcriptionKey: '`',
 *   onSubmit, submitKeypress: 'shift+enter', enabled: true,
 * });
 * ```
 */
export function useGlobalKeyboardShortcuts({
  onTranscriptionStart,
  onTranscriptionStop,
  transcriptionKey = '`',
  transcriptionEnabled = true,
  onSubmit,
  onSubmitWithNewline,
  submitKeypress = 'shift+enter',
  enabled = true,
}: GlobalKeyboardShortcuts) {
  const isRecordingRef = useRef(false);
  const isInputFocusedRef = useRef(false);
  const onTranscriptionStartRef = useRef(onTranscriptionStart);
  const onTranscriptionStopRef = useRef(onTranscriptionStop);
  const transcriptionKeyRef = useRef(transcriptionKey);
  onTranscriptionStartRef.current = onTranscriptionStart;
  onTranscriptionStopRef.current = onTranscriptionStop;
  transcriptionKeyRef.current = transcriptionKey;

  // Track input focus state
  const setInputFocused = useCallback((focused: boolean) => {
    isInputFocusedRef.current = focused;
  }, []);

  const transcriptionActive = enabled && transcriptionEnabled;
  const DEBUG =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

  // Hold transcription key to record, release to transcribe (no toggle)
  // Native listener + refs so the handler always uses latest key and callbacks
  useEffect(() => {
    if (!transcriptionActive || !onTranscriptionStart || !onTranscriptionStop) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = transcriptionKeyRef.current;
      if (!matchesTranscriptionKey(event, key)) return;

      // Don't trigger when typing in input fields
      if (isInputElement(document.activeElement)) {
        if (DEBUG) console.log('[PTT] keydown ignored: input focused');
        return;
      }

      // Ignore key repeat
      if (event.repeat) return;

      event.preventDefault();

      if (!isRecordingRef.current) {
        isRecordingRef.current = true;
        if (DEBUG) console.log('[PTT] keydown: start recording');
        onTranscriptionStartRef.current?.();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = transcriptionKeyRef.current;
      if (!matchesTranscriptionKey(event, key)) return;

      event.preventDefault();

      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        if (DEBUG) console.log('[PTT] keyup: stop recording');
        onTranscriptionStopRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [transcriptionActive, onTranscriptionStart, onTranscriptionStop, DEBUG]);

  // Configurable submit keypress
  // Parse the submitKeypress string and set up the hotkey
  const submitKeypressLower = submitKeypress.toLowerCase();

  useHotkeys(
    submitKeypressLower,
    (event) => {
      if (!enabled || !onSubmit) return;
      // Only handle if input is focused
      if (isInputFocusedRef.current) {
        event.preventDefault();
        onSubmit();
      }
    },
    {
      preventDefault: true,
      enabled: enabled && !!onSubmit,
    },
    [enabled, onSubmit, submitKeypressLower]
  );

  // If submit is shift+enter, then enter should allow newline
  // If submit is enter, then shift+enter should allow newline
  const isShiftEnterSubmit = submitKeypressLower === 'shift+enter';
  const newlineKey = isShiftEnterSubmit ? 'enter' : 'shift+enter';

  useHotkeys(
    newlineKey,
    () => {
      if (!enabled || !onSubmitWithNewline) return;
      if (isInputFocusedRef.current) {
        // Allow default behavior (newline) but also call callback
        onSubmitWithNewline();
      }
    },
    {
      preventDefault: false,
      enabled: enabled && !!onSubmitWithNewline,
    },
    [enabled, onSubmitWithNewline, newlineKey]
  );

  return {
    /** Callback to signal whether an input/textarea is focused (suppresses shortcuts). */
    setInputFocused,
    /** Ref tracking whether an input/textarea is currently focused. */
    isInputFocusedRef,
  };
}
