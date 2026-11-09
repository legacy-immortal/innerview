/**
 * messageBubbleTextPart.tsx — Text part renderer with citation and tool-call affordances.
 *
 * @module components/chat/condensed/messageBubbleTextPart
 */

import { Box, HStack, IconButton, Link, Text, VStack } from '@chakra-ui/react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { monoFontFamily } from './messageBubbleUtils';

export interface ExtendedTextPart {
  readonly text?: string;
  citations?: Array<{
    id?: string;
    title?: string;
    url?: string;
    snippet?: string;
  }>;
  readonly toolCallId?: string;
  readonly toolName?: string;
  readonly toolInput?: unknown;
  readonly toolOutput?: unknown;
  searchResults?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
  }>;
}

interface TextPartProps {
  readonly part: ExtendedTextPart;
  readonly messageId: string;
  readonly index: number;
  readonly collapsedSections: Set<string>;
  readonly onToggleSection: (sectionId: string) => void;
}

export const TextPart = ({
  part,
  messageId,
  index,
  collapsedSections,
  onToggleSection,
}: TextPartProps) => (
  <Box key={index}>
    <MarkdownRenderer
      content={part.text ?? ''}
      fontSize="sm"
      color="gray.100"
    />
    {/* Display citations */}
    {part.citations && part.citations.length > 0 && (
      <Box
        mt={3}
        p={3}
        borderRadius="md"
        bg="rgba(34, 211, 238, 0.1)"
        borderLeft="2px solid"
        borderColor="cyan.400"
      >
        <Text
          fontSize="xs"
          color="cyan.300"
          fontWeight={600}
          mb={2}
          letterSpacing="0.05em"
        >
          CITATIONS
        </Text>
        <VStack gap={2} align="stretch">
          {part.citations.map((citation, idx) => (
            <Box key={idx}>
              {citation.url ? (
                <Link
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="cyan.400"
                  textDecoration="underline"
                  fontSize="sm"
                  _hover={{ color: 'cyan.300' }}
                >
                  {citation.title || citation.id || `Citation ${idx + 1}`}
                </Link>
              ) : (
                <Text fontSize="sm" color="cyan.300">
                  {citation.title || citation.id || `Citation ${idx + 1}`}
                </Text>
              )}
              {citation.snippet && (
                <Text fontSize="xs" color="cyan.200" mt={1}>
                  {citation.snippet}
                </Text>
              )}
            </Box>
          ))}
        </VStack>
      </Box>
    )}
    {/* Display tool calls */}
    {part.toolName &&
      (() => {
        const sectionId = `tool-${messageId}-${index}`;
        const isCollapsed = collapsedSections.has(sectionId);
        return (
          <Box
            mt={3}
            px={3}
            py={1}
            borderRadius={0}
            bg="rgba(250, 204, 21, 0.1)"
            border="0.5px solid"
            borderColor="rgba(250, 204, 21, 0.3)"
          >
            <HStack
              justify="space-between"
              align="center"
              mb={isCollapsed ? 0 : 2}
              cursor="pointer"
              onClick={() => onToggleSection(sectionId)}
              _hover={{ bg: 'rgba(250, 204, 21, 0.15)' }}
              mx={-1}
              transition="background-color 0.05s linear"
            >
              <Text
                fontSize="xs"
                color="yellow.300"
                fontWeight={600}
                letterSpacing="0.1em"
                fontFamily={monoFontFamily}
                textTransform="uppercase"
              >
                [TOOL: {part.toolName}]
              </Text>
              <IconButton
                aria-label={
                  isCollapsed ? 'Expand tool call' : 'Collapse tool call'
                }
                size="xs"
                variant="ghost"
                colorPalette="yellow"
                borderRadius={0}
                _hover={{ bg: 'rgba(250, 204, 21, 0.3)' }}
              >
                {isCollapsed ? <HiChevronDown /> : <HiChevronUp />}
              </IconButton>
            </HStack>
            {!isCollapsed && (
              <Box css={{ display: 'block' }}>
                {part.toolInput !== undefined && (
                  <Box mb={2}>
                    <Text fontSize="xs" color="yellow.400" mb={1}>
                      Input:
                    </Text>
                    <Text
                      fontSize="xs"
                      color="yellow.200"
                      fontFamily="monospace"
                      whiteSpace="pre-wrap"
                    >
                      {typeof part.toolInput === 'string'
                        ? part.toolInput
                        : JSON.stringify(part.toolInput, null, 2)}
                    </Text>
                  </Box>
                )}
                {part.toolOutput !== undefined && (
                  <Box>
                    <Text fontSize="xs" color="yellow.400" mb={1}>
                      Output:
                    </Text>
                    <Text
                      fontSize="xs"
                      color="yellow.200"
                      fontFamily="monospace"
                      whiteSpace="pre-wrap"
                    >
                      {typeof part.toolOutput === 'string'
                        ? part.toolOutput
                        : JSON.stringify(part.toolOutput, null, 2)}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );
      })()}
    {/* Display web search results */}
    {part.searchResults &&
      part.searchResults.length > 0 &&
      (() => {
        const sectionId = `search-${messageId}-${index}`;
        const isCollapsed = collapsedSections.has(sectionId);
        return (
          <Box
            mt={3}
            px={3}
            py={1}
            borderRadius={0}
            bg="rgba(16, 185, 129, 0.1)"
            border="0.5px solid"
            borderColor="rgba(16, 185, 129, 0.3)"
          >
            <HStack
              justify="space-between"
              align="center"
              mb={isCollapsed ? 0 : 2}
              cursor="pointer"
              onClick={() => onToggleSection(sectionId)}
              _hover={{ bg: 'rgba(16, 185, 129, 0.15)' }}
              p={1}
              mx={-1}
              transition="background-color 0.05s linear"
            >
              <Text
                fontSize="xs"
                color="emerald.300"
                fontWeight={600}
                letterSpacing="0.1em"
                fontFamily={monoFontFamily}
                textTransform="uppercase"
              >
                [SEARCH RESULTS]
              </Text>
              <IconButton
                aria-label={
                  isCollapsed
                    ? 'Expand search results'
                    : 'Collapse search results'
                }
                size="xs"
                variant="ghost"
                colorPalette="emerald"
                borderRadius={0}
                _hover={{ bg: 'rgba(16, 185, 129, 0.3)' }}
              >
                {isCollapsed ? <HiChevronDown /> : <HiChevronUp />}
              </IconButton>
            </HStack>
            {!isCollapsed && (
              <Box css={{ display: 'block' }}>
                <VStack gap={2} align="stretch">
                  {part.searchResults.map((result, idx) => (
                    <Box key={idx}>
                      {result.url ? (
                        <Link
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          color="emerald.400"
                          textDecoration="underline"
                          fontSize="sm"
                          _hover={{ color: 'emerald.300' }}
                        >
                          {result.title || `Result ${idx + 1}`}
                        </Link>
                      ) : (
                        <Text fontSize="sm" color="emerald.300">
                          {result.title || `Result ${idx + 1}`}
                        </Text>
                      )}
                      {result.snippet && (
                        <Text fontSize="xs" color="emerald.200" mt={1}>
                          {result.snippet}
                        </Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
          </Box>
        );
      })()}
  </Box>
);
