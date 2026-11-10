/**
 * @file local-transcription-config.ts — Configuration types for the local transcription provider.
 * @module lib/transcription/local/local-transcription-config
 *
 * Configuration types for the local transcription provider (browser
 * Transformers.js or backend faster-whisper). Documents the opt-in-only
 * browser model download gate.
 */

/** Configuration for local transcription (browser Transformers.js or backend faster-whisper). */
export interface LocalTranscriptionConfig {
  /**
   * Mode: 'browser' for HuggingFace Transformers in browser, 'backend' for faster-whisper on server.
   */
  mode: 'browser' | 'backend';

  /**
   * Backend URL for transcription API (only used in backend mode)
   */
  backendUrl: string;

  /**
   * Model ID for Transformers.js (browser mode) or faster-whisper (backend mode)
   * Examples: 'Xenova/whisper-base', 'openai/whisper-small', 'openai/whisper-large-v3'
   */
  modelId: string;

  /**
   * Whether to use quantized models (smaller, faster, less accurate)
   */
  quantized: boolean;

  /**
   * Whether the browser (Transformers.js) Whisper model may be downloaded
   * on demand. Defaults to `false`: the browser model is NEVER auto-loaded
   * post-bootstrap. It may only be loaded via the dedicated opt-in loading
   * phase ({@link LocalTranscriptionModel.ensureBrowserModelLoaded} /
   * {@link preloadBrowserWhisperModel}) after the user explicitly opts in.
   */
  allowBrowserModelLoad?: boolean;

  /**
   * Language hint in ISO-639-1 format (e.g., 'en')
   */
  language?: string;

  /**
   * Task type: 'transcribe' or 'translate'
   */
  task?: 'transcribe' | 'translate';
}
