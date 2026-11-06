// Kokoro TTS Configuration

export interface KokoroConfig {
  modelId?: string;
  dtype?: 'q8' | 'q4';
  device?: 'wasm' | 'cpu' | 'gpu';
  defaultVoice?: string;
}

export type KokoroVoice = string;

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

export const SUPPORTED_KOKORO_MODELS = [
  'Kokoro-82M-v1.0-ONNX',
  'onnx-community/Kokoro-82M-v1.0-ONNX',
] as const;

