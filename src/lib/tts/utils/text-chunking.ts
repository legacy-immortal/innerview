// Improved text chunking utility using regex pattern
// Based on Chrome Speech Synthesis chunking pattern

/**
 * Chunk text intelligently using regex pattern
 * Prioritizes sentence boundaries, then word boundaries
 *
 * Pattern explanation:
 * 1. `^[\\s\\S]{min,max}[.!?,]{1}` - Match sentence boundary within chunk size
 * 2. `^[\\s\\S]{1,max}$` - Match end of text
 * 3. `^[\\s\\S]{1,max} ` - Match word boundary within chunk size
 */
export function chunkText(text: string, chunkSize: number = 400): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let offset = 0;

  while (offset < text.length) {
    const remaining = text.substring(offset);

    // Build regex pattern
    const minLength = Math.floor(chunkSize / 2);
    const regex = new RegExp(
      `^[\\s\\S]{${minLength},${chunkSize}}[.!?,]{1}|` +
      `^[\\s\\S]{1,${chunkSize}}$|` +
      `^[\\s\\S]{1,${chunkSize}} `
    );

    const match = remaining.match(regex);

    if (match && match[0] && match[0].length > 2) {
      // Found a good chunk
      const chunk = match[0].trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      offset += match[0].length;
    } else {
      // Fallback: take remaining text (or up to chunkSize)
      const fallbackChunk = remaining.substring(0, chunkSize).trim();
      if (fallbackChunk.length > 0) {
        chunks.push(fallbackChunk);
      }
      offset += Math.min(chunkSize, remaining.length);

      // If we've processed all text, break
      if (offset >= text.length) {
        break;
      }
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

