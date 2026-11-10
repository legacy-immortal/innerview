/**
 * @file tts/index.ts — Public entry point for the streaming-first TTS module.
 * @module lib/tts
 *
 * Public entry point for the streaming-first TTS module. Re-exports the TTS
 * contracts, provider models (Kokoro, browser), the top-level TTSService and
 * StreamingTTSService, and all TTS utilities so consumers can import from a
 * single stable path.
 */
export * from './types';
export * from './kokoro';
export * from './browser';
export * from './tts-service';
export * from './streaming-service';
export * from './utils/audio-converter';
export * from './utils/pcm-processor';
export * from './utils/text-chunking';
export * from './utils/text-preprocessing';
export * from './utils/mobile-detection';
export * from './utils/debounce';
