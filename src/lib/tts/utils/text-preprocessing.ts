/**
 * @file text-preprocessing.ts — Normalizes text before TTS generation.
 * @module lib/tts/utils/text-preprocessing
 *
 * Text preprocessing utilities for TTS. Prepares input text by replacing
 * tildes with periods and collapsing whitespace so Kokoro receives clean,
 * speakable text.
 */

/**
 * Preprocess text before TTS generation.
 * Replaces tildes with periods (a common Kokoro pronunciation hint) and
 * collapses runs of whitespace/newlines into single spaces, then trims.
 * @param text - Raw input text to preprocess.
 * @returns Cleaned text, or an empty string when input is falsy or not a string.
 */
export function preprocessText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Replace tilde with period (common pattern Kokoro treats as a pause/hint)
  text = text.replace(/~/g, '.');

  // Normalize whitespace (collapse multiple spaces/newlines into one space)
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

