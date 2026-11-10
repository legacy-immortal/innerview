/**
 * @file kokoro/index.ts — Public exports for the Kokoro TTS module.
 * @module lib/tts/kokoro
 *
 * Public entry point for the Kokoro TTS module. Re-exports the configuration
 * types, voice/model catalogs, and the KokoroTTSModel implementation so the
 * TTS service and settings UI can import from a single path.
 */
export * from './kokoro-config';
export { KokoroTTSModel, type KokoroVoiceId } from './kokoro-model';
