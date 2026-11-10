/**
 * @file message-conversion.ts — Convert between ConversationMessage store format and AI SDK UIMessage format.
 * @module utils/message-conversion
 *
 * Pure helpers for converting between the conversation store's
 * ConversationMessage format and the AI SDK's UIMessage format. Parses
 * reasoning tags consistently between streaming and non-streaming paths,
 * extracts message text, and preserves rich part data (citations, tool
 * calls, files, search results).
 */
import type { ConversationMessage } from '@/lib/conversation-store';
import { isTextUIPart, type TextPart, type UIMessage } from 'ai';
import {
  extractPartsContent,
  parseReasoningFromComplete,
} from './streaming-parser';

/**
 * Parse reasoning tags from text content.
 * Uses the streaming parser for consistency between streaming and
 * non-streaming parsing.
 * @param text - Raw text that may contain reasoning tags.
 * @param tagName - The reasoning tag name to parse (e.g. 'thinking').
 * @returns The cleaned text and an array of reasoning strings.
 * @example
 * ```ts
 * const { text, reasoning } = parseReasoningTags('Hello <think>hidden</think> world', 'think');
 * // { text: 'Hello  world', reasoning: ['hidden'] }
 * ```
 */
export const parseReasoningTags = (
  text: string,
  tagName: string
): { text: string; reasoning: string[] } => {
  const parts = parseReasoningFromComplete(text, tagName);
  return extractPartsContent(parts);
};

/**
 * Extract text content from a UIMessage
 */
export const extractMessageText = (message: UIMessage): string => {
  if (!message.parts) return '';
  return message.parts
    .filter((part): part is TextPart => part != null && isTextUIPart(part))
    .map((part: TextPart) => part.text ?? '')
    .join(' ');
};

/**
 * Convert ConversationMessage from store to UIMessage format
 */
export const convertStoreToMessages = (
  storeMessages: ConversationMessage[],
  reasoningTag: string
): UIMessage[] => {
  return storeMessages.map((msg) => {
    const parts: UIMessage['parts'] = [];

    // If message has parts, process them
    if (msg.parts && msg.parts.length > 0) {
      for (const part of msg.parts) {
        // Handle reasoning parts - keep them as reasoning
        if (part.type === 'reasoning' && part.text) {
          parts.push({
            type: 'reasoning' as const,
            text: part.text,
          });
          continue;
        }

        // Handle text parts - parse reasoning tags and preserve rich data
        if (part.type === 'text' && part.text) {
          const { text: cleanedText, reasoning } = parseReasoningTags(
            part.text,
            reasoningTag
          );

          // Add reasoning parts first
          for (const reasoningText of reasoning) {
            parts.push({
              type: 'reasoning' as const,
              text: reasoningText,
            });
          }

          // Add cleaned text part if there's any text left, preserving rich data
          if (cleanedText) {
            const textPart: UIMessage['parts'][number] & {
              citations?: typeof part.citations;
              toolCallId?: string;
              toolName?: string;
              toolInput?: unknown;
              toolOutput?: unknown;
              searchResults?: typeof part.searchResults;
            } = {
              type: 'text' as const,
              text: cleanedText,
            };

            // Preserve citations if present
            if ('citations' in part && part.citations) {
              textPart.citations = part.citations;
            }

            // Preserve tool call data if present
            if ('toolName' in part && part.toolName) {
              textPart.toolCallId = part.toolCallId;
              textPart.toolName = part.toolName;
              if ('toolInput' in part) {
                textPart.toolInput = part.toolInput;
              }
              if ('toolOutput' in part) {
                textPart.toolOutput = part.toolOutput;
              }
            }

            // Preserve search results if present
            if ('searchResults' in part && part.searchResults) {
              textPart.searchResults = part.searchResults;
            }

            parts.push(textPart);
          }
          continue;
        }

        // Handle file parts - convert to AI SDK compatible format
        if (part.type === 'file') {
          parts.push({
            type: 'file' as const,
            url: part.url || '',
            mediaType: part.mediaType || 'application/octet-stream',
            filename: part.filename,
          });
          continue;
        }

        // For other types, try to preserve them
        if (part.type === 'text') {
          parts.push({
            type: 'text' as const,
            text: part.text || '',
          });
        }
      }
    } else if (msg.content) {
      // If message only has content (no parts), parse it for reasoning tags
      const { text: cleanedText, reasoning } = parseReasoningTags(
        msg.content,
        reasoningTag
      );

      // Add reasoning parts first
      for (const reasoningText of reasoning) {
        parts.push({
          type: 'reasoning' as const,
          text: reasoningText,
        });
      }

      // Add cleaned text part if there's any text left
      if (cleanedText) {
        parts.push({
          type: 'text' as const,
          text: cleanedText,
        });
      }
    }

    // Ensure we have at least one part
    if (parts.length === 0) {
      parts.push({
        type: 'text' as const,
        text: '',
      });
    }

    return {
      id: msg.id,
      role: msg.role,
      parts,
    };
  });
};
