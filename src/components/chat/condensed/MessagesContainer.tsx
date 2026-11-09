/**
 * MessagesContainer.tsx — Scroll container + virtualiser hosting the message stream.
 *
 * @module components/chat/condensed/MessagesContainer
 */

import { TerminalLoader } from '@/components/animations/TerminalLoader';
import { Box, HStack, Text } from '@chakra-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useMemo } from 'react';
import type { UIMessage } from 'ai';
import {
  emeraldGlowStyles,
  headerTextShadowStyles,
  messagesContainerStyles,
  separatorTextShadowStyles,
  textShadowStyles,
} from '../shared/ChatStyles';
import { MessageBubble } from './MessageBubble';

interface MessagesContainerProps {
  readonly messages: UIMessage[];
  readonly isLoading: boolean;
  readonly isLoadingMessages: boolean;
  readonly messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  readonly messagesParentRef: React.RefObject<HTMLDivElement | null>;
  readonly virtualizer: ReturnType<
    typeof useVirtualizer<HTMLDivElement, Element>
  >;
  readonly onDeleteMessage?: (messageId: string) => void;
}

/** One virtualized row — memoized so streaming ticks only re-render the visible tail. */
const VirtualRow = memo(function VirtualRow({
  message,
  start,
  index,
  onDeleteMessage,
  measureRef,
}: {
  readonly message: UIMessage;
  readonly start: number;
  readonly index: number;
  readonly onDeleteMessage?: (messageId: string) => void;
  readonly measureRef: (node: HTMLDivElement | null) => void;
}): React.JSX.Element {
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      w="100%"
      maxW="100%"
      minW={0}
      style={{ transform: `translateY(${start}px)` }}
      data-index={index}
      ref={(node: HTMLDivElement | null) => {
        measureRef(node);
      }}
    >
      <MessageBubble message={message} onDeleteMessage={onDeleteMessage} />
    </Box>
  );
});

const MessagesContainerComponent = ({
  messages,
  isLoading,
  isLoadingMessages,
  messagesContainerRef,
  messagesParentRef,
  virtualizer,
  onDeleteMessage,
}: MessagesContainerProps) => {
  const virtualItems = virtualizer.getVirtualItems();
  const measureRef = useMemo(
    () => (node: HTMLDivElement | null) => {
      if (node) virtualizer.measureElement(node);
    },
    [virtualizer]
  );
  const nowLabel = useMemo(
    () =>
      new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    []
  );
  return (
    <Box
      ref={messagesContainerRef}
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={{ base: '108px', md: '120px' }}
      overflowY="auto"
      overflowX="hidden"
      w="100%"
      maxW="100%"
      minW={0}
      p={{ base: 2, md: 4 }}
      boxSizing="border-box"
      css={messagesContainerStyles}
    >
      <TerminalLoader
        isLoading={isLoadingMessages}
        message="LOADING MESSAGES"
      />
      <Box
        ref={messagesParentRef}
        position="relative"
        w="100%"
        maxW="100%"
        minW={0}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index];
          if (!message) return null;

          return (
            <VirtualRow
              key={virtualItem.key}
              message={message}
              start={virtualItem.start}
              index={virtualItem.index}
              onDeleteMessage={onDeleteMessage}
              measureRef={measureRef}
            />
          );
        })}
      </Box>

      {isLoading && (
        <Box
          py={2}
          w="100%"
          maxW="100%"
          minW={0}
          boxSizing="border-box"
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          fontSize="sm"
          lineHeight="1.6"
        >
          <HStack gap={2} align="baseline" flexWrap="wrap">
            <Text
              as="span"
              fontSize="xs"
              color="gray.500"
              fontFamily="inherit"
              letterSpacing="0.05em"
              css={headerTextShadowStyles}
            >
              {nowLabel}
            </Text>
            <Text
              as="span"
              fontSize="xs"
              color="emerald.400"
              fontWeight={600}
              fontFamily="inherit"
              letterSpacing="0.1em"
              css={emeraldGlowStyles}
            >
              [INTERLOCUTOR]
            </Text>
            <Text
              as="span"
              fontSize="xs"
              color="gray.400"
              fontFamily="inherit"
              css={separatorTextShadowStyles}
            >
              ›
            </Text>
          </HStack>
          <Text
            pl={6}
            color="gray.400"
            fontStyle="italic"
            fontSize="sm"
            fontFamily="inherit"
            css={textShadowStyles}
          >
            listening...
          </Text>
        </Box>
      )}
      <div />
    </Box>
  );
};

export const MessagesContainer = memo(MessagesContainerComponent);
