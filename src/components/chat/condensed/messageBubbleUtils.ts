/**
 * messageBubbleUtils.ts — helpers for the condensed message bubbles.
 *
 * Provides token estimation, message-part equality, and the shared style
 * objects used by every message bubble part renderer.
 *
 * @module components/chat/condensed/messageBubbleUtils
 */

import { isReasoningUIPart, isTextUIPart, type UIMessage } from 'ai';

/** Approximate characters per token for English text. */
const CHARS_PER_TOKEN = 4;

/**
 * Estimates the token count for a text snippet.
 *
 * @param text Text to estimate.
 * @returns Estimated tokens (>= 1 for non-empty text, else 0).
 */
export function estimateTokenCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return Math.max(1, Math.ceil(text.trim().length / CHARS_PER_TOKEN));
}

// Format time - memoized per render to avoid recalculation
// Using static placeholder to avoid unnecessary re-renders
// Time display is not critical for performance
export const TIME_PLACEHOLDER = '--:--:--';

// Move CSS objects outside component to ensure stable references
export const messageBubbleStyles = {
  '& *': {
    maxWidth: '100%',
    minWidth: 0,
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    boxSizing: 'border-box',
  },
};

export const timeTextStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
};

export const separatorTextStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.05)',
};

export const contentBoxStyles = {
  textShadow:
    '0 0 4px rgba(255, 255, 255, 0.08), 0 0 8px rgba(255, 255, 255, 0.04)',
};

export const monoFontFamily =
  "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace";

/** Type alias for the message-parts array compared by {@link arePartsEqual}. */
export type MessageParts = UIMessage['parts'];

/**
 * Deeply compares two message-part arrays.
 *
 * Text and reasoning parts compare by content; other parts fall back to a
 * shallow structural comparison.
 *
 * @param parts1 First parts array.
 * @param parts2 Second parts array.
 * @returns `true` when both arrays are structurally equal.
 */
export const arePartsEqual = (
  parts1: MessageParts,
  parts2: MessageParts
): boolean => {
  if (parts1.length !== parts2.length) return false;
  for (let i = 0; i < parts1.length; i++) {
    const part1 = parts1[i];
    const part2 = parts2[i];
    if (part1.type !== part2.type) return false;
    // Compare text content
    if (isTextUIPart(part1) && isTextUIPart(part2)) {
      if ((part1.text ?? '') !== (part2.text ?? '')) return false;
    }
    // Compare reasoning content
    if (isReasoningUIPart(part1) && isReasoningUIPart(part2)) {
      if ((part1.text ?? '') !== (part2.text ?? '')) return false;
    }
    // For other types, do a shallow comparison
    if (JSON.stringify(part1) !== JSON.stringify(part2)) return false;
  }
  return true;
};
