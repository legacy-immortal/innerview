// Configuration for local transcription provider

export interface LocalTranscriptionConfig {
  /**
   * Mode: 'browser' for HuggingFace Transformers in browser, 'backend' for faster-whisper on server
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
   * Language hint in ISO-639-1 format (e.g., 'en')
   */
  language?: string;

  /**
   * Task type: 'transcribe' or 'translate'
   */
  task?: 'transcribe' | 'translate';
}
