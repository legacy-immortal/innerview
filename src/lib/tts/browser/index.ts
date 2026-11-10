/**
 * @file browser/index.ts — Public exports for the browser SpeechSynthesis TTS module.
 * @module lib/tts/browser
 *
 * Public entry point for the browser SpeechSynthesis TTS module. Re-exports
 * the default voice constants, BrowserVoice and BrowserTTSOptions types, and
 * the BrowserTTSModel implementation so consumers can import from one path.
 */
export {
  BROWSER_DEFAULT_VOICE_ID,
  BROWSER_DEFAULT_VOICE_NAME,
  type BrowserTTSOptions,
  type BrowserVoice,
} from './browser-model';
export * from './browser-model';

