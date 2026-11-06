/**
 * Hook for processing streaming messages with reasoning tag parsing
 * Transforms raw streamed messages into parsed format with separate reasoning parts
 */

import {
  StreamingReasoningParser,
  extractPartsContent,
  type StreamingPart,
} from '@/utils/streaming-parser';
import type { UIMessage } from 'ai';
import { useEffect, useMemo, useRef } from 'react';

export interface ParsedStreamingMessage extends Omit<UIMessage, 'parts'> {
  parts: UIMessage['parts'];
  // Additional streaming metadata
  isStreaming: boolean;
  parsedReasoningParts: StreamingPart[];
}

interface UseStreamingMessagesOptions {
  messages: UIMessage[];
  reasoningTag: string;
  streamingEnabled: boolean;
  isLoading: boolean;
}

/**
 * Process messages and parse reasoning tags from streaming content
 * For the last message (when streaming), parses reasoning tags in real-time
 * For completed messages, uses the standard parts array
 */
export function useStreamingMessages({
  messages,
  reasoningTag,
  streamingEnabled,
  isLoading,
}: UseStreamingMessagesOptions): ParsedStreamingMessage[] {
  // Maintain parser instance for the current streaming message
  const parserRef = useRef<StreamingReasoningParser | null>(null);
  const lastParsedContentRef = useRef<string>('');

  // Reset parser when a new message starts streaming
  useEffect(() => {
    if (!isLoading) {
      // Reset when streaming stops
      parserRef.current = null;
      lastParsedContentRef.current = '';
    }
  }, [isLoading]);

  // Update parser reasoning tag when settings change
  useEffect(() => {
    if (parserRef.current) {
      parserRef.current.setReasoningTag(reasoningTag);
    }
  }, [reasoningTag]);

  return useMemo(() => {
    if (!messages || messages.length === 0) {
      return [];
    }

    return messages.map((message, index) => {
      const isLastMessage = index === messages.length - 1;
      const isStreaming =
        isLoading && isLastMessage && message.role === 'assistant';

      // For non-streaming messages or when streaming is disabled, use standard parts
      if (!streamingEnabled || !isStreaming) {
        return {
          ...message,
          isStreaming: false,
          parsedReasoningParts: [],
        };
      }

      // For the currently streaming message, parse reasoning tags from text parts
      let currentTextContent = '';
      for (const part of message.parts) {
        if (part.type === 'text' && 'text' in part) {
          currentTextContent += part.text || '';
        }
      }

      // Initialize parser if needed
      if (!parserRef.current) {
        parserRef.current = new StreamingReasoningParser(reasoningTag);
      }

      // Only process new content
      if (currentTextContent.length > lastParsedContentRef.current.length) {
        const newContent = currentTextContent.substring(
          lastParsedContentRef.current.length
        );
        parserRef.current.processToken(newContent);
        lastParsedContentRef.current = currentTextContent;
      }

      const parsedParts = parserRef.current.getParts();

      // Build new parts array with parsed reasoning
      const newParts: UIMessage['parts'] = [];

      // Add non-text parts first (tool calls, files, etc.)
      for (const part of message.parts) {
        if (part.type !== 'text') {
          newParts.push(part);
        }
      }

      // Add parsed text and reasoning parts
      for (const parsedPart of parsedParts) {
        if (parsedPart.type === 'reasoning' && parsedPart.content) {
          newParts.push({
            type: 'reasoning' as const,
            text: parsedPart.content,
          });
        } else if (parsedPart.type === 'text' && parsedPart.content) {
          newParts.push({
            type: 'text' as const,
            text: parsedPart.content,
          });
        }
      }

      // Ensure at least one part exists
      if (newParts.length === 0) {
        newParts.push({
          type: 'text' as const,
          text: '',
        });
      }

      return {
        ...message,
        parts: newParts,
        isStreaming: true,
        parsedReasoningParts: parsedParts,
      };
    });
  }, [messages, isLoading, streamingEnabled, reasoningTag]);
}

/**
 * Finalize a streaming message by completing parsing
 * Call this when streaming ends to ensure all content is properly parsed
 */
export function finalizeStreamingMessage(
  message: UIMessage,
  reasoningTag: string
): UIMessage {
  // Extract all text content from the message
  let textContent = '';
  const nonTextParts: UIMessage['parts'] = [];

  for (const part of message.parts) {
    if (part.type === 'text' && 'text' in part) {
      textContent += part.text || '';
    } else {
      nonTextParts.push(part);
    }
  }

  // Parse reasoning tags from the complete text
  const parser = new StreamingReasoningParser(reasoningTag);
  parser.processToken(textContent);
  const parsedParts = parser.finalize();

  // Build final parts array
  const { text, reasoning } = extractPartsContent(parsedParts);
  const finalParts: UIMessage['parts'] = [...nonTextParts];

  // Add reasoning parts first
  for (const reasoningText of reasoning) {
    finalParts.push({
      type: 'reasoning' as const,
      text: reasoningText,
    });
  }

  // Add text part
  if (text) {
    finalParts.push({
      type: 'text' as const,
      text,
    });
  }

  // Ensure at least one part
  if (finalParts.length === 0) {
    finalParts.push({
      type: 'text' as const,
      text: '',
    });
  }

  return {
    ...message,
    parts: finalParts,
  };
}
