/**
 * @file text-chunking.ts — Splits text into sentence-aware chunks for streaming TTS.
 * @module lib/tts/utils/text-chunking
 *
 * Improved text chunking utility using a regex pattern, based on the Chrome
 * Speech Synthesis chunking pattern. Splits long text into chunks that end
 * at sentence boundaries where possible, then word boundaries, so streaming
 * TTS can yield natural-sounding segments.
 */

/**
 * Chunk text intelligently using regex pattern.
 * Prioritizes sentence boundaries ([.!?,]) within the chunk size, then end
 * of text, then word boundaries. Falls back to a hard chunkSize slice when
 * no boundary matches.
 * @param text - Text to chunk.
 * @param chunkSize - Max characters per chunk (default 400).
 * @returns Non-empty chunks in order.
 */
export function chunkText(text: string, chunkSize: number = 400): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let offset = 0;

  while (offset < text.length) {
    const remaining = text.substring(offset);

    // Build regex pattern: sentence boundary, then end-of-text, then word boundary
    const minLength = Math.floor(chunkSize / 2);
    const regex = new RegExp(
      `^[\\s\\S]{${minLength},${chunkSize}}[.!?,]{1}|` +
      `^[\\s\\S]{1,${chunkSize}}$|` +
      `^[\\s\\S]{1,${chunkSize}} `
    );

    const match = remaining.match(regex);

    if (match && match[0] && match[0].length > 2) {
      // Found a good chunk ending at a natural boundary
      const chunk = match[0].trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      offset += match[0].length;
    } else {
      // Fallback: take remaining text (or up to chunkSize) so we never stall
      const fallbackChunk = remaining.substring(0, chunkSize).trim();
      if (fallbackChunk.length > 0) {
        chunks.push(fallbackChunk);
      }
      offset += Math.min(chunkSize, remaining.length);

      // If we've processed all text, break out of the loop
      if (offset >= text.length) {
        break;
      }
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

