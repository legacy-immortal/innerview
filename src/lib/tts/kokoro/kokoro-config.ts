/**
 * @file kokoro-config.ts — Kokoro TTS configuration types and voice/model catalogs.
 * @module lib/tts/kokoro/kokoro-config
 *
 * Runtime configuration for the Kokoro TTS model plus the catalog of
 * supported voices and model ids consumed by the settings UI and the
 * KokoroTTSModel worker.
 */

/** Runtime configuration for the Kokoro TTS model. */
export interface KokoroConfig {
  /** Model identifier to load. */
  modelId?: string;
  /** Numeric precision for inference ('q8' or 'q4'). */
  dtype?: 'q8' | 'q4';
  /** Execution device preference ('wasm', 'cpu', or 'gpu'). */
  device?: 'wasm' | 'cpu' | 'gpu';
  /** Default voice id. */
  defaultVoice?: string;
}

/** Kokoro voice identifier (a voice id string such as 'af_heart'). */
export type KokoroVoice = string;

/** Supported Kokoro voice ids. */
export const KOKORO_VOICES = [
  'af_heart',
  'af_alloy',
  'af_aoede',
  'af_bella',
  'af_jessica',
  'af_kore',
  'af_nicole',
  'af_nova',
  'af_river',
  'af_sarah',
  'af_sky',
  'am_adam',
  'am_echo',
  'am_eric',
  'am_fenrir',
  'am_liam',
  'am_michael',
  'am_onyx',
  'am_puck',
  'am_santa',
  'bf_emma',
  'bf_isabella',
  'bm_george',
  'bm_lewis',
  'bf_alice',
  'bf_lily',
  'bm_daniel',
  'bm_fable',
] as const;

/** Supported Kokoro model ids. */
export const SUPPORTED_KOKORO_MODELS = [
  'Kokoro-82M-v1.0-ONNX',
  'onnx-community/Kokoro-82M-v1.0-ONNX',
] as const;

