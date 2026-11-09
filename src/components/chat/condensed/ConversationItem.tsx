/**
 * ConversationItem.tsx — Single row in the conversation list (title, preview, date, badge).
 *
 * @module components/chat/condensed/ConversationItem
 */

import { Box, HStack, Text } from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';

export interface ConversationItemProps {
  conversation: {
    id: string;
    title: string;
    preview?: string;
    updatedAt: string;
    messageCount: number;
  };
  readonly isActive: boolean;
  readonly onSelect: (id: string) => void;
  readonly formatDate: (dateString: string) => string;
  readonly itemBackgroundColor: string;
  readonly itemHoverBackgroundColor: string;
  readonly itemActiveBackgroundColor: string;
}

// Memoized conversation item component to prevent unnecessary re-renders
export const ConversationItem = React.memo<ConversationItemProps>(
  ({
    conversation,
    isActive,
    onSelect,
    formatDate,
    itemBackgroundColor,
    itemHoverBackgroundColor,
    itemActiveBackgroundColor,
  }) => {
    const handleClick = useCallback(() => {
      onSelect(conversation.id);
    }, [conversation.id, onSelect]);

    // Memoize CSS styles to prevent recreation
    const boxStyles = useMemo(
      () => ({
        textShadow: isActive
          ? '0 0 4px rgba(16, 185, 129, 0.3)'
          : '0 0 2px rgba(255, 255, 255, 0.05)',
      }),
      [isActive]
    );

    const titleStyles = useMemo(
      () => ({
        textShadow: isActive
          ? '0 0 6px rgba(16, 185, 129, 0.4)'
          : '0 0 2px rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      [isActive]
    );

    const previewStyles = useMemo(
      () => ({
        textShadow: '0 0 2px rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      []
    );

    return (
      <Box
        p={3}
        cursor="pointer"
        bg={isActive ? itemActiveBackgroundColor : itemBackgroundColor}
        borderLeft={isActive ? '2px solid' : '2px solid transparent'}
        borderColor={isActive ? 'emerald.400' : 'transparent'}
        _hover={{
          bg: isActive ? itemActiveBackgroundColor : itemHoverBackgroundColor,
        }}
        onClick={handleClick}
        position="relative"
        css={boxStyles}
      >
        <HStack justify="space-between" align="flex-start" mb={1}>
          <Text
            fontSize="xs"
            fontWeight={isActive ? 600 : 400}
            color={isActive ? 'emerald.300' : 'gray.300'}
            flex={1}
            css={titleStyles}
          >
            {conversation.title}
          </Text>
        </HStack>

        {conversation.preview && (
          <Text fontSize="xs" color="gray.500" mb={1} css={previewStyles}>
            {conversation.preview}
          </Text>
        )}

        <HStack gap={2} fontSize="xs" color="gray.600">
          <Text>{formatDate(conversation.updatedAt)}</Text>
          <Text>•</Text>
          <Text>{conversation.messageCount} messages</Text>
        </HStack>
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if conversation data, active state, or style colors change
    return (
      prevProps.conversation.id === nextProps.conversation.id &&
      prevProps.conversation.title === nextProps.conversation.title &&
      prevProps.conversation.preview === nextProps.conversation.preview &&
      prevProps.conversation.updatedAt === nextProps.conversation.updatedAt &&
      prevProps.conversation.messageCount ===
        nextProps.conversation.messageCount &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.onSelect === nextProps.onSelect &&
      prevProps.formatDate === nextProps.formatDate &&
      prevProps.itemBackgroundColor === nextProps.itemBackgroundColor &&
      prevProps.itemHoverBackgroundColor ===
        nextProps.itemHoverBackgroundColor &&
      prevProps.itemActiveBackgroundColor ===
        nextProps.itemActiveBackgroundColor
    );
  }
);

ConversationItem.displayName = 'ConversationItem';
