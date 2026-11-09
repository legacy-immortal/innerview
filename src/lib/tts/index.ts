/**
 * @file Public entry point for the streaming-first TTS module.
 * @module lib/tts/index.ts
 */
// Streaming-first TTS Module
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
