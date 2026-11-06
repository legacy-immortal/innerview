import { TerminalLoader } from '@/components/animations/TerminalLoader';
import { Box, HStack, Text } from '@chakra-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  messages: UIMessage[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesParentRef: React.RefObject<HTMLDivElement | null>;
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  onDeleteMessage?: (messageId: string) => void;
}

export const MessagesContainer = ({
  messages,
  isLoading,
  isLoadingMessages,
  messagesContainerRef,
  messagesParentRef,
  virtualizer,
  onDeleteMessage,
}: MessagesContainerProps) => {
  return (
    <Box
      ref={messagesContainerRef}
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom="120px"
      overflowY="auto"
      overflowX="hidden"
      w="100%"
      maxW="100%"
      minW={0}
      p={4}
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
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          if (!message) return null;

          return (
            <Box
              key={virtualItem.key}
              position="absolute"
              top={0}
              left={0}
              right={0}
              w="100%"
              maxW="100%"
              minW={0}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data-index={virtualItem.index}
              ref={(node: HTMLDivElement | null) => {
                if (node) {
                  virtualizer.measureElement(node);
                }
              }}
            >
              <MessageBubble
                message={message}
                onDeleteMessage={onDeleteMessage}
              />
            </Box>
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
              {new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
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
