/**
 * messageBubbleReasoningPart.tsx — Collapsible reasoning/thinking part inside a message bubble.
 *
 * @module components/chat/condensed/messageBubbleReasoningPart
 */

import { Box, HStack, IconButton, Text } from '@chakra-ui/react';
import type { ReasoningUIPart } from 'ai';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { estimateTokenCount, monoFontFamily } from './messageBubbleUtils';

interface ReasoningPartProps {
  readonly part: ReasoningUIPart;
  readonly sectionId: string;
  readonly isCollapsed: boolean;
  readonly onToggle: (sectionId: string) => void;
  readonly index: number;
}

export const ReasoningPart = ({
  part,
  sectionId,
  isCollapsed,
  onToggle,
  index,
}: ReasoningPartProps) => (
  <Box
    key={index}
    mb={2}
    py={1}
    borderRadius={0}
    css={{
      '&:last-child': {
        marginBottom: 0,
      },
    }}
  >
    <HStack
      justify="space-between"
      align="center"
      mb={isCollapsed ? 0 : 1}
      cursor="pointer"
      onClick={() => onToggle(sectionId)}
      _hover={{
        bg: 'rgba(139, 92, 246, 0.1)',
      }}
      py={1}
      transition="background-color 0.05s linear"
    >
      <HStack gap={2} align="center">
        <Text
          fontSize="xs"
          color="purple.300"
          fontWeight={600}
          letterSpacing="0.1em"
          fontFamily={monoFontFamily}
          textTransform="uppercase"
        >
          [REASONING]
        </Text>
        <Text fontSize="xs" color="purple.400" fontFamily={monoFontFamily}>
          {estimateTokenCount(part.text ?? '')}t
        </Text>
      </HStack>
      <IconButton
        aria-label={isCollapsed ? 'Expand reasoning' : 'Collapse reasoning'}
        size="xs"
        variant="ghost"
        colorPalette="purple"
        borderRadius={0}
        _hover={{ bg: 'rgba(139, 92, 246, 0.3)' }}
      >
        {isCollapsed ? <HiChevronDown /> : <HiChevronUp />}
      </IconButton>
    </HStack>
    {!isCollapsed && (
      <MarkdownRenderer
        content={part.text ?? ''}
        fontSize="sm"
        color="purple.200"
      />
    )}
  </Box>
);
