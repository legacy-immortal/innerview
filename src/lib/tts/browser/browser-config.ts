/**
 * @file browser-config.ts — Browser SpeechSynthesis voice enumeration.
 * @module lib/tts/browser/browser-config
 *
 * Browser TTS Configuration. Enumerates available Web Speech API voices so
 * the settings UI can populate a voice selector for the browser TTS provider.
 */

/**
 * Get available browser SpeechSynthesis voices.
 * Returns an empty list when speechSynthesis is unavailable (e.g. SSR or
 * non-browser environments) so callers can safely render a voice selector.
 * @returns Array of SpeechSynthesisVoice objects.
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

