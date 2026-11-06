// Text preprocessing utilities for TTS

/**
 * Preprocess text before TTS generation
 * Normalizes text, handles special characters, etc.
 */
export function preprocessText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Replace tilde with period (common pattern)
  text = text.replace(/~/g, '.');

  // Normalize whitespace (collapse multiple spaces/newlines)
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

