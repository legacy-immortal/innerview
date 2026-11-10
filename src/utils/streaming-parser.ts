/**
 * @file streaming-parser.ts — Streaming parser for LLM reasoning tags.
 * @module utils/streaming-parser
 *
 * Streaming parser for LLM responses. Handles real-time parsing of reasoning
 * tags and content during token streaming. Detects opening/closing tags
 * (e.g. </think>, <thinking>) case-insensitively, buffers partial tags across token
 * boundaries so split tokens are handled correctly, and yields StreamingPart
 * entries. Used by useStreamingMessages and message-conversion for consistent
 * parsing across streaming and non-streaming paths.
 */

export type StreamingPartType = 'text' | 'reasoning' | 'tool-call';

export interface StreamingPart {
  type: StreamingPartType;
  content: string;
  isComplete: boolean;
}

export interface StreamingParserState {
  parts: StreamingPart[];
  currentPartIndex: number;
  buffer: string;
  isInReasoningTag: boolean;
  currentCloseTag: string; // The closing tag we're looking for (matched case from opening)
}

// Common reasoning tag names to detect
const DEFAULT_REASONING_TAGS = ['think', 'thinking', 'reasoning', 'thought'];

/**
 * Streaming parser that detects and parses reasoning tags in real-time
 * Handles opening tags like <think>, <thinking>, etc. and their closing counterparts
 * Case-insensitive matching with support for common tag variations
 */
export class StreamingReasoningParser {
  private state: StreamingParserState;
  private _tagName: string;
  private tagPatterns: string[]; // All tag patterns to match
  private openTagRegex: RegExp;

  constructor(reasoningTagName: string = 'thinking') {
    this._tagName = reasoningTagName;
    // Build list of tags to match: user's tag + common defaults
    this.tagPatterns = this.buildTagPatterns(reasoningTagName);
    this.openTagRegex = this.buildOpenTagRegex();
    this.state = this.createInitialState();
  }

  /**
   * Build the list of tag patterns to match
   */
  private buildTagPatterns(primaryTag: string): string[] {
    const patterns = new Set<string>();
    // Add the user's primary tag
    patterns.add(primaryTag.toLowerCase());
    // Add common variations
    for (const tag of DEFAULT_REASONING_TAGS) {
      patterns.add(tag.toLowerCase());
    }
    return Array.from(patterns);
  }

  /**
   * Build regex to match any of the opening tags (case-insensitive)
   */
  private buildOpenTagRegex(): RegExp {
    // Match <tagname> with optional attributes, case-insensitive
    const tagAlternatives = this.tagPatterns
      .map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    return new RegExp(`<(${tagAlternatives})(?:\\s[^>]*)?>`, 'i');
  }

  /** The current reasoning tag name being matched. */
  get tagName(): string {
    return this._tagName;
  }

  private createInitialState(): StreamingParserState {
    return {
      parts: [],
      currentPartIndex: -1,
      buffer: '',
      isInReasoningTag: false,
      currentCloseTag: '',
    };
  }

  /**
   * Reset parser state for a new message.
   * Clears the buffer, parts, and reasoning flag so the parser can be reused.
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Update the reasoning tag (e.g., when user changes settings).
   * Rebuilds the tag pattern list and opening-tag regex from the new tag.
   * @param newTagName - New reasoning tag name (e.g. 'thinking').
   */
  setReasoningTag(newTagName: string): void {
    this._tagName = newTagName;
    this.tagPatterns = this.buildTagPatterns(newTagName);
    this.openTagRegex = this.buildOpenTagRegex();
  }

  /**
   * Get the current parser state.
   * Returns a shallow copy so callers cannot mutate internal state.
   * @returns A copy of the current StreamingParserState.
   */
  getState(): StreamingParserState {
    return { ...this.state };
  }

  /**
   * Get all parsed parts.
   * @returns A copy of the parsed StreamingPart array.
   */
  getParts(): StreamingPart[] {
    return [...this.state.parts];
  }

  /**
   * Process a new token/chunk and return updated parts.
   * Adds the token to the buffer and processes it for tag boundaries.
   * @param token - New text token to process.
   * @returns The updated parsed parts array.
   */
  processToken(token: string): StreamingPart[] {
    // Add token to buffer for tag detection
    this.state.buffer += token;

    // Process the buffer
    this.processBuffer();

    return this.getParts();
  }

  /**
   * Find closing tag in buffer (case-insensitive)
   */
  private findCloseTag(
    buffer: string,
    closeTag: string
  ): { index: number; length: number } {
    const lowerBuffer = buffer.toLowerCase();
    const lowerCloseTag = closeTag.toLowerCase();
    const index = lowerBuffer.indexOf(lowerCloseTag);
    return { index, length: closeTag.length };
  }

  /**
   * Process the buffer looking for tags and content
   */
  private processBuffer(): void {
    let buffer = this.state.buffer;

    while (buffer.length > 0) {
      if (this.state.isInReasoningTag) {
        // Currently inside reasoning tag - look for closing tag
        const closeResult = this.findCloseTag(
          buffer,
          this.state.currentCloseTag
        );

        if (closeResult.index !== -1) {
          // Found closing tag
          const reasoningContent = buffer.substring(0, closeResult.index);
          this.appendToCurrentPart(reasoningContent, 'reasoning');
          this.completeCurrentPart();

          // Move past the closing tag
          buffer = buffer.substring(closeResult.index + closeResult.length);
          this.state.isInReasoningTag = false;
          this.state.currentCloseTag = '';
        } else {
          // Check if buffer might contain partial closing tag
          const partialMatch = this.findPartialTagMatch(
            buffer,
            this.state.currentCloseTag
          );

          if (partialMatch.isPartial) {
            // Buffer ends with potential partial closing tag
            const safeContent = buffer.substring(
              0,
              buffer.length - partialMatch.matchLength
            );
            if (safeContent.length > 0) {
              this.appendToCurrentPart(safeContent, 'reasoning');
            }
            // Keep the partial tag in buffer
            buffer = buffer.substring(buffer.length - partialMatch.matchLength);
            break;
          } else {
            // No partial match - append all to reasoning
            this.appendToCurrentPart(buffer, 'reasoning');
            buffer = '';
          }
        }
      } else {
        // Not in reasoning tag - look for opening tag using regex
        const match = this.openTagRegex.exec(buffer);

        if (match) {
          const openIndex = match.index;
          const matchedTag = match[1]; // The captured tag name
          const fullMatch = match[0]; // The full matched string including <>

          // Found opening tag
          const textContent = buffer.substring(0, openIndex);
          if (textContent.length > 0) {
            this.appendToCurrentPart(textContent, 'text');
            this.completeCurrentPart();
          }

          // Move past the opening tag and start reasoning
          buffer = buffer.substring(openIndex + fullMatch.length);
          this.state.isInReasoningTag = true;
          // Store the closing tag we need to look for (preserving case from match)
          this.state.currentCloseTag = `</${matchedTag}>`;
          this.startNewPart('reasoning');
        } else {
          // Check if buffer might contain partial opening tag
          // Look for potential start of any tag
          const partialMatch = this.findPartialOpeningTag(buffer);

          if (partialMatch.isPartial) {
            // Buffer ends with potential partial opening tag
            const safeContent = buffer.substring(
              0,
              buffer.length - partialMatch.matchLength
            );
            if (safeContent.length > 0) {
              this.appendToCurrentPart(safeContent, 'text');
            }
            // Keep the partial tag in buffer
            buffer = buffer.substring(buffer.length - partialMatch.matchLength);
            break;
          } else {
            // No partial match - append all to text
            this.appendToCurrentPart(buffer, 'text');
            buffer = '';
          }
        }
      }
    }

    this.state.buffer = buffer;
  }

  /**
   * Check if buffer ends with a partial opening tag for any of our tag patterns
   */
  private findPartialOpeningTag(str: string): {
    isPartial: boolean;
    matchLength: number;
  } {
    // Check if str ends with '<' or a partial tag like '<thi' or '<think'
    const lastLt = str.lastIndexOf('<');
    if (lastLt === -1) {
      return { isPartial: false, matchLength: 0 };
    }

    const potentialTag = str.substring(lastLt).toLowerCase();

    // Check if this could be the start of any of our tags
    for (const tagName of this.tagPatterns) {
      const fullOpenTag = `<${tagName}>`;
      // Check if potentialTag is a prefix of the full tag
      if (fullOpenTag.startsWith(potentialTag)) {
        return { isPartial: true, matchLength: str.length - lastLt };
      }
      // Also check tags with attributes: <tagname ...>
      const tagWithAttr = `<${tagName} `;
      if (
        tagWithAttr.startsWith(potentialTag) ||
        potentialTag.startsWith(tagWithAttr.substring(0, potentialTag.length))
      ) {
        return { isPartial: true, matchLength: str.length - lastLt };
      }
    }

    // Check for </tagname partial (closing tag)
    if (potentialTag.startsWith('</')) {
      for (const tagName of this.tagPatterns) {
        const fullCloseTag = `</${tagName}>`;
        if (fullCloseTag.startsWith(potentialTag)) {
          return { isPartial: true, matchLength: str.length - lastLt };
        }
      }
    }

    return { isPartial: false, matchLength: 0 };
  }

  /**
   * Check if a string ends with a partial match of a tag (case-insensitive)
   */
  private findPartialTagMatch(
    str: string,
    tag: string
  ): { isPartial: boolean; matchLength: number } {
    const lowerStr = str.toLowerCase();
    const lowerTag = tag.toLowerCase();

    // Check if str ends with the beginning of the tag
    for (let i = 1; i < lowerTag.length && i <= lowerStr.length; i++) {
      const suffix = lowerStr.substring(lowerStr.length - i);
      const tagPrefix = lowerTag.substring(0, i);
      if (suffix === tagPrefix) {
        return { isPartial: true, matchLength: i };
      }
    }
    return { isPartial: false, matchLength: 0 };
  }

  /**
   * Start a new part of the given type
   */
  private startNewPart(type: StreamingPartType): void {
    const newPart: StreamingPart = {
      type,
      content: '',
      isComplete: false,
    };
    this.state.parts.push(newPart);
    this.state.currentPartIndex = this.state.parts.length - 1;
  }

  /**
   * Append content to the current part, or start a new one if needed
   */
  private appendToCurrentPart(content: string, type: StreamingPartType): void {
    if (content.length === 0) return;

    const currentPart = this.state.parts[this.state.currentPartIndex];

    if (!currentPart || currentPart.isComplete || currentPart.type !== type) {
      // Need to start a new part
      this.startNewPart(type);
    }

    this.state.parts[this.state.currentPartIndex].content += content;
  }

  /**
   * Mark the current part as complete
   */
  private completeCurrentPart(): void {
    const currentPart = this.state.parts[this.state.currentPartIndex];
    if (currentPart) {
      currentPart.isComplete = true;
    }
  }

  /**
   * Finalize parsing - flush any remaining buffer content.
   * Flushes leftover buffer as text (or reasoning if still in a tag), marks
   * all parts complete, and returns the final parts array.
   * @returns The final parsed StreamingPart array.
   */
  finalize(): StreamingPart[] {
    // Flush any remaining buffer as text (or reasoning if we're still in a tag)
    if (this.state.buffer.length > 0) {
      const type = this.state.isInReasoningTag ? 'reasoning' : 'text';
      this.appendToCurrentPart(this.state.buffer, type);
      this.state.buffer = '';
    }

    // Mark all parts as complete
    for (const part of this.state.parts) {
      part.isComplete = true;
    }

    return this.getParts();
  }
}

/**
 * Parse reasoning tags from a complete (non-streaming) response.
 * Uses the same logic as the streaming parser for consistency between
 * streaming and non-streaming paths.
 * @param text - Complete text that may contain reasoning tags.
 * @param reasoningTag - The reasoning tag name to parse (default 'thinking').
 * @returns Parsed parts with reasoning and text separated.
 * @example
 * ```ts
 * const parts = parseReasoningFromComplete('Hello </think>world', 'think');
 * // parts: [{type:'text',content:'Hello '},{type:'reasoning',content:'world'}]
 * ```
 */
export function parseReasoningFromComplete(
  text: string,
  reasoningTag: string = 'thinking'
): StreamingPart[] {
  const parser = new StreamingReasoningParser(reasoningTag);
  parser.processToken(text);
  return parser.finalize();
}

/**
 * Extract text and reasoning arrays from parsed parts.
 * Useful for converting streaming output to stored message format.
 * @param parts - Parsed streaming parts array.
 * @returns Object with concatenated text and an array of reasoning strings.
 * @example
 * ```ts
 * const { text, reasoning } = extractPartsContent(parts);
 * // text: 'Hello world', reasoning: ['hidden thought']
 * ```
 */
export function extractPartsContent(parts: StreamingPart[]): {
  text: string;
  reasoning: string[];
} {
  let text = '';
  const reasoning: string[] = [];

  for (const part of parts) {
    if (part.type === 'text') {
      text += part.content;
    } else if (part.type === 'reasoning') {
      reasoning.push(part.content);
    }
  }

  return { text: text.trim(), reasoning };
}
