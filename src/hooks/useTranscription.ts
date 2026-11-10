/**
 * @file useTranscription.ts — React hook for push-to-talk transcription.
 * @module hooks/useTranscription
 *
 * React hook for push-to-talk transcription. Manages recording state
 * (MediaRecorder + AudioContext visualization), transcription via the
 * transcription service (OpenAI or local provider), and a dedicated opt-in
 * loading phase for the browser Whisper model that never auto-downloads
 * post-bootstrap.
 */
import { useSettingsStore } from '@/lib/settings-store';
import {
  localTranscription,
  transcriptionService,
  type LocalTranscriptionModel,
  type TranscriptionOptions,
  type TranscriptionResult,
} from '@/lib/transcription';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseTranscriptionOptions {
  /**
   * Provider to use: 'openai' for production, 'local' for development
   */
  provider?: 'openai' | 'local';

  /**
   * Language hint in ISO-639-1 format (e.g., 'en')
   */
  language?: string;

  /**
   * Model ID to use
   */
  modelId?: string;

  /**
   * Callback when transcription completes
   */
  onTranscriptionComplete?: (result: TranscriptionResult) => void;

  /**
   * Callback when transcription fails
   */
  onTranscriptionError?: (error: Error) => void;

  /**
   * Key to use for push-to-talk (default: '`')
   */
  pushToTalkKey?: string;

  /**
   * Whether to enable push-to-talk keyboard handling in this hook (default: false).
   * Set to false when useGlobalKeyboardShortcuts handles the key; set to true for standalone use.
   */
  enablePushToTalk?: boolean;

  /**
   * Opt-in for the browser (Transformers.js) Whisper model. Defaults to
   * `false`: the browser model must NEVER auto-load post-bootstrap. When
   * `false`, local browser-mode transcription fails fast with an opt-in
   * error instead of downloading. When `true`, the model is loaded through
   * the dedicated loading phase ({@link ensureModelLoaded}) — surfaced via
   * `isModelLoading` — never silently inside `doGenerate`.
   */
  allowBrowserModelLoad?: boolean;
}

export interface UseTranscriptionReturn {
  /**
   * Whether recording is currently active
   */
  isRecording: boolean;

  /**
   * Whether transcription is in progress
   */
  isTranscribing: boolean;

  /**
   * Whether the (opt-in) browser model is loading in its dedicated phase.
   * Distinct from `isTranscribing` so the UI can show a loading indicator.
   */
  isModelLoading: boolean;

  /**
   * Whether the (opt-in) browser model has been loaded via
   * {@link ensureModelLoaded}. Always true for non-browser providers.
   */
  isModelLoaded: boolean;

  /**
   * Dedicated opt-in loading phase for the browser Whisper model. No-op for
   * OpenAI/backend providers. When browser-mode loading was not opted into
   * (`allowBrowserModelLoad: false`), this fails fast and never downloads.
   */
  ensureModelLoaded: () => Promise<void>;

  /**
   * Current audio level (0-1) for visualization
   */
  audioLevel: number;

  /**
   * Start recording manually
   */
  startRecording: () => Promise<void>;

  /**
   * Stop recording and transcribe
   */
  stopRecording: () => Promise<void>;

  /**
   * Cancel recording without transcribing
   */
  cancelRecording: () => void;

  /**
   * Latest transcription result
   */
  result: TranscriptionResult | null;

  /**
   * Latest error
   */
  error: Error | null;
}

export function useTranscription(
  options: UseTranscriptionOptions = {}
): UseTranscriptionReturn {
  const {
    provider = 'local',
    language,
    modelId,
    onTranscriptionComplete,
    onTranscriptionError,
    pushToTalkKey: _pushToTalkKey = '`',
    enablePushToTalk: _enablePushToTalk = false,
    allowBrowserModelLoad = false,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onstopHandledRef = useRef(false);
  const isRecordingRef = useRef(false);

  // Helpers (no-op for OpenAI/backend: nothing to load post-bootstrap) ----

  /**
   * Resolve the effective local mode from settings (defaults to `backend`,
   * matching transcription-service). Only `browser` needs a loading phase.
   */
  const getLocalMode = useCallback((): 'browser' | 'backend' => {
    const localMode = useSettingsStore.getState().getTranscriptionSettings()
      ?.local?.mode;
    return localMode === 'browser' ? 'browser' : 'backend';
  }, []);

  /**
   * Check whether the next transcribe would need the browser model.
   * @returns True only for local + browser mode.
   */
  const needsBrowserModel = useCallback((): boolean => {
    return provider === 'local' && getLocalMode() === 'browser';
  }, [provider, getLocalMode]);

  /**
   * Dedicated opt-in loading phase for the browser Whisper model.
   * - Non-browser providers / backend mode: no-op (already bootstrapped).
   * - Browser mode without opt-in: fails fast, never downloads.
   * - Browser mode with opt-in: loads via the cached provider model
   *   instance so a later transcribe reuses it (no double download).
   */
  const ensureModelLoaded = useCallback(async () => {
    if (!needsBrowserModel()) {
      setIsModelLoaded(true);
      return;
    }
    if (!allowBrowserModelLoad) {
      const error = new Error(
        'Browser Whisper model is opt-in only and was not enabled. ' +
          'Enable browser transcription in settings (opt-in), or use the ' +
          'backend model loaded during bootstrap.'
      );
      setError(error);
      onTranscriptionError?.(error);
      throw error;
    }
    // Already loaded: nothing to do (fresh instances re-check below).
    localTranscription.setAllowBrowserModelLoad(true);
    const model = localTranscription.transcriptionModel(
      'whisper-browser'
    ) as unknown as LocalTranscriptionModel;
    if (model.isBrowserModelLoaded()) {
      setIsModelLoaded(true);
      return;
    }
    setIsModelLoading(true);
    setError(null);
    try {
      await model.ensureBrowserModelLoaded();
      setIsModelLoaded(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Model load failed');
      setError(error);
      onTranscriptionError?.(error);
      throw error;
    } finally {
      setIsModelLoading(false);
    }
  }, [allowBrowserModelLoad, needsBrowserModel, onTranscriptionError]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    audioChunksRef.current = [];
    setAudioLevel(0);
  }, []);

  // Start recording (idempotent: no-op if already recording)
  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current != null) {
      return; // Already recording
    }
    try {
      onstopHandledRef.current = false;
      setError(null);
      setIsRecording(true);
      isRecordingRef.current = true;
      audioChunksRef.current = [];

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Set up audio visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Start monitoring audio levels; use ref so animation loop sees current state
      const monitorAudio = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average level
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255);

        if (isRecordingRef.current) {
          animationFrameRef.current = requestAnimationFrame(monitorAudio);
        }
      };

      monitorAudio();

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (onstopHandledRef.current) return;
        onstopHandledRef.current = true;
        cleanup();

        if (audioChunksRef.current.length === 0) {
          isRecordingRef.current = false;
          setIsRecording(false);
          return;
        }

        const chunks = audioChunksRef.current;
        const audioBlob = new Blob(chunks, {
          type: mediaRecorder.mimeType,
        });

        try {
          // Dedicated opt-in loading phase BEFORE transcribing: browser
          // mode without opt-in fails fast here (never downloads); with
          // opt-in it loads visibly via `isModelLoading`, not silently
          // inside the transcribe call.
          await ensureModelLoaded();
          setIsTranscribing(true);
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioData = new Uint8Array(arrayBuffer);

          const transcriptionOptions: TranscriptionOptions = {
            provider,
            language,
            modelId,
          };

          const transcriptionResult = await transcriptionService.transcribe(
            audioData,
            transcriptionOptions
          );

          setResult(transcriptionResult);
          onTranscriptionComplete?.(transcriptionResult);
        } catch (err) {
          const error =
            err instanceof Error ? err : new Error('Transcription failed');
          setError(error);
          onTranscriptionError?.(error);
        } finally {
          isRecordingRef.current = false;
          setIsTranscribing(false);
          setIsRecording(false);
        }
      };

      // Request data every 250ms so short recordings still yield chunks
      mediaRecorder.start(250);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      onTranscriptionError?.(error);
      isRecordingRef.current = false;
      setIsRecording(false);
      cleanup();
    }
  }, [
    cleanup,
    ensureModelLoaded,
    provider,
    language,
    modelId,
    onTranscriptionComplete,
    onTranscriptionError,
  ]);

  // Stop recording and transcribe (idempotent: only first call triggers stop)
  const stopRecording = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mediaRecorderRef.current = null;
    mr.stop();
  }, []);

  // Cancel recording without transcribing (idempotent)
  const cancelRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    isRecordingRef.current = false;
    setIsRecording(false);
    mr.stop();
    cleanup();
  }, [cleanup]);

  // Keep isRecordingRef in sync with state for external consumers
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (mediaRecorderRef.current && isRecordingRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [cleanup]);

  return {
    isRecording,
    isTranscribing,
    isModelLoading,
    isModelLoaded,
    ensureModelLoaded,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    result,
    error,
  };
}
