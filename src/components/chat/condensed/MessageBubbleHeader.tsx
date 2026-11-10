/**
 * @file MessageBubbleHeader.tsx — Role label, timestamp, and actions for a message bubble.
 * @module components/chat/condensed/MessageBubbleHeader
 *
 * Role label, timestamp, and actions for a message bubble. Shows an animated pulsing dot while
 * streaming and a delete button when `onDeleteMessage` is provided. Consumed by `MessageBubble`.
 */

import { Box, HStack, IconButton, Text } from '@chakra-ui/react';
import type { JSX } from 'react';
import { LuX } from 'react-icons/lu';
import { separatorTextStyles, timeTextStyles } from './messageBubbleUtils';

interface MessageBubbleHeaderProps {
  readonly roleLabel: string;
  readonly roleColor: string;
  readonly roleTextStyles: React.CSSProperties;
  readonly displayTime: string;
  readonly isStreaming: boolean;
  readonly onDeleteMessage?: (messageId: string) => void;
  readonly messageId: string;
}

/**
 * Renders the role label, timestamp, and actions for a message bubble.
 *
 * @param props - Message bubble header props.
 * @returns The header element.
 */
export const MessageBubbleHeader = ({
  roleLabel,
  roleColor,
  roleTextStyles,
  displayTime,
  isStreaming,
  onDeleteMessage,
  messageId,
}: MessageBubbleHeaderProps): JSX.Element => (
  <HStack
    gap={2}
    mb={1}
    align="baseline"
    flexWrap="wrap"
    justify="space-between"
  >
    <HStack gap={2} align="baseline" flexWrap="wrap">
      <Text
        as="span"
        fontSize="xs"
        color="gray.500"
        fontFamily="inherit"
        letterSpacing="0.05em"
        css={timeTextStyles}
      >
        {displayTime}
      </Text>
      <Text
        as="span"
        fontSize="xs"
        color={roleColor}
        fontWeight={600}
        fontFamily="inherit"
        letterSpacing="0.1em"
        css={roleTextStyles}
      >
        [{roleLabel}]
      </Text>
      <Text
        as="span"
        fontSize="xs"
        color="gray.400"
        fontFamily="inherit"
        css={separatorTextStyles}
      >
        ›
      </Text>
      {isStreaming && (
        <Box
          as="span"
          w="6px"
          h="6px"
          borderRadius="full"
          bg="emerald.400"
          ml={1}
          css={{
            animation: 'pulse 1s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.4 },
            },
          }}
          title="Streaming..."
        />
      )}
    </HStack>
    {onDeleteMessage && (
      <IconButton
        aria-label="Delete message"
        size="xs"
        variant="ghost"
        colorPalette="gray"
        onClick={() => onDeleteMessage(messageId)}
      >
        <LuX />
      </IconButton>
    )}
  </HStack>
);
