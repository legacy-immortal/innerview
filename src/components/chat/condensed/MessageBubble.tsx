/**
 * MessageBubble.tsx — Full message bubble composing header, parts, and footer.
 *
 * @module components/chat/condensed/MessageBubble
 */

import type { ParsedStreamingMessage } from '@/hooks/useStreamingMessages';
import { Box } from '@chakra-ui/react';
import { isReasoningUIPart, type UIMessage } from 'ai';
import React from 'react';
import { MessageBubbleHeader } from './MessageBubbleHeader';
import { MessageBubblePart } from './MessageBubblePart';
import {
  TIME_PLACEHOLDER,
  arePartsEqual,
  contentBoxStyles,
  messageBubbleStyles,
} from './messageBubbleUtils';

interface MessageBubbleProps {
  readonly message: UIMessage | ParsedStreamingMessage;
  readonly onDeleteMessage?: (messageId: string) => void;
}

const MessageBubbleComponent = ({
  message,
  onDeleteMessage,
}: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const roleLabel = isUser ? 'USER' : 'INTERLOCUTOR';
  const roleColor = isUser ? 'blue.400' : 'emerald.400';
  // Check if this message is currently streaming
  const isStreaming =
    'isStreaming' in message && (message as ParsedStreamingMessage).isStreaming;

  // Track collapsed state for reasoning and tool call sections
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(
    new Set()
  );

  // Collapse reasoning sections by default (once per message)
  const reasoningDefaultCollapsedRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const msgId = message.id;
    if (reasoningDefaultCollapsedRef.current.has(msgId)) return;
    reasoningDefaultCollapsedRef.current.add(msgId);
    const reasoningIds = (message.parts ?? [])
      .map((part, index) =>
        isReasoningUIPart(part) ? `reasoning-${message.id}-${index}` : null
      )
      .filter((id): id is string => id != null);
    if (reasoningIds.length > 0) {
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        reasoningIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [message.id, message.parts]);

  const toggleSection = React.useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Memoize role text shadow styles to prevent recreation
  const roleTextStyles = React.useMemo(
    () => ({
      textShadow: `0 0 8px ${isUser ? 'rgba(59, 130, 246, 0.5)' : 'rgba(16, 185, 129, 0.5)'}, 0 0 16px ${isUser ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
    }),
    [isUser]
  );

  // Memoize time to prevent recalculation on every render
  // Using placeholder to avoid performance impact
  const displayTime = React.useMemo(() => TIME_PLACEHOLDER, []);

  return (
    <Box
      mb={3}
      py={2}
      w="100%"
      maxW="100%"
      minW={0}
      boxSizing="border-box"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      fontSize="sm"
      lineHeight="1.6"
      css={messageBubbleStyles}
    >
      <MessageBubbleHeader
        roleLabel={roleLabel}
        roleColor={roleColor}
        roleTextStyles={roleTextStyles}
        displayTime={displayTime}
        isStreaming={isStreaming}
        onDeleteMessage={onDeleteMessage}
        messageId={message.id}
      />

      <Box
        pl={6}
        w="100%"
        maxW="100%"
        minW={0}
        boxSizing="border-box"
        overflowWrap="anywhere"
        wordBreak="break-word"
        overflowX="hidden"
        color="gray.100"
        css={contentBoxStyles}
      >
        {message.parts.map((part, index) => (
          <MessageBubblePart
            key={index}
            part={part}
            messageId={message.id}
            index={index}
            collapsedSections={collapsedSections}
            onToggleSection={toggleSection}
          />
        ))}
      </Box>
    </Box>
  );
};

// Memoize the component with custom comparison to prevent unnecessary re-renders
// Only re-render if message id, role, or parts content actually change
export const MessageBubble = React.memo(
  MessageBubbleComponent,
  (prevProps, nextProps) => {
    // Fast path: same reference means no change
    if (prevProps.message === nextProps.message) return true;

    // Compare message id and role
    if (
      prevProps.message.id !== nextProps.message.id ||
      prevProps.message.role !== nextProps.message.role
    ) {
      return false;
    }

    // Deep compare parts to avoid re-renders when only object reference changes
    const prevParts = prevProps.message.parts || [];
    const nextParts = nextProps.message.parts || [];
    return arePartsEqual(prevParts, nextParts);
  }
);
