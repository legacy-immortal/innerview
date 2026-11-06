import type { ParsedStreamingMessage } from '@/hooks/useStreamingMessages';
import { Box, HStack, IconButton, Link, Text, VStack } from '@chakra-ui/react';
import {
  getToolOrDynamicToolName,
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolOrDynamicToolUIPart,
  type ReasoningUIPart,
  type TextPart,
  type UIMessage,
} from 'ai';
import React from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { LuX } from 'react-icons/lu';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { MemoryIndicator } from '../shared/MemoryIndicator';

interface MessageBubbleProps {
  message: UIMessage | ParsedStreamingMessage;
  onDeleteMessage?: (messageId: string) => void;
}

// Approximate token count from text (~4 chars per token for English)
function estimateTokenCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

// Format time - memoized per render to avoid recalculation
// Using static placeholder to avoid unnecessary re-renders
// Time display is not critical for performance
const TIME_PLACEHOLDER = '--:--:--';

// Move CSS objects outside component to ensure stable references
const messageBubbleStyles = {
  '& *': {
    maxWidth: '100%',
    minWidth: 0,
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    boxSizing: 'border-box',
  },
};

const timeTextStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
};

const separatorTextStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.05)',
};

const contentBoxStyles = {
  textShadow:
    '0 0 4px rgba(255, 255, 255, 0.08), 0 0 8px rgba(255, 255, 255, 0.04)',
};

// Helper function to deeply compare message parts
const arePartsEqual = (
  parts1: UIMessage['parts'],
  parts2: UIMessage['parts']
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
            onClick={() => onDeleteMessage(message.id)}
          >
            <LuX />
          </IconButton>
        )}
      </HStack>

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
        {message.parts.map((part, index) => {
          if (isReasoningUIPart(part)) {
            const reasoningPart = part as ReasoningUIPart;
            const sectionId = `reasoning-${message.id}-${index}`;
            const isCollapsed = collapsedSections.has(sectionId);
            return (
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
                  onClick={() => toggleSection(sectionId)}
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
                      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                      textTransform="uppercase"
                    >
                      [REASONING]
                    </Text>
                    <Text
                      fontSize="xs"
                      color="purple.400"
                      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                    >
                      {estimateTokenCount(reasoningPart.text ?? '')}t
                    </Text>
                  </HStack>
                  <IconButton
                    aria-label={
                      isCollapsed ? 'Expand reasoning' : 'Collapse reasoning'
                    }
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
                    content={reasoningPart.text ?? ''}
                    fontSize="sm"
                    color="purple.200"
                  />
                )}
              </Box>
            );
          }
          if (isFileUIPart(part)) {
            // Type guard narrows to FileUIPart which has url property
            const filePart = part;
            const fileUrl = 'url' in filePart ? filePart.url : '';
            const isDataUrl = fileUrl.startsWith('data:');
            return (
              <Box
                key={index}
                mb={2}
                p={3}
                borderRadius="md"
                bg="rgba(59, 130, 246, 0.1)"
                borderLeft="2px solid"
                borderColor="blue.400"
                css={{
                  '&:last-child': {
                    marginBottom: 0,
                  },
                }}
              >
                <Text
                  fontSize="xs"
                  color="blue.300"
                  fontWeight={600}
                  mb={1}
                  letterSpacing="0.05em"
                >
                  FILE
                </Text>
                <Text fontSize="sm" color="blue.200" mb={1}>
                  {'filename' in filePart
                    ? filePart.filename || 'Untitled file'
                    : 'Untitled file'}
                </Text>
                <Text fontSize="xs" color="blue.300" mb={2}>
                  {'mediaType' in filePart
                    ? filePart.mediaType || 'application/octet-stream'
                    : 'application/octet-stream'}
                </Text>
                {fileUrl ? (
                  isDataUrl ? (
                    <Link
                      href={fileUrl}
                      download={
                        'filename' in filePart ? filePart.filename : undefined
                      }
                      color="blue.400"
                      textDecoration="underline"
                      fontSize="sm"
                      _hover={{ color: 'blue.300' }}
                    >
                      Download file
                    </Link>
                  ) : (
                    <Link
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="blue.400"
                      textDecoration="underline"
                      fontSize="sm"
                      _hover={{ color: 'blue.300' }}
                    >
                      Open file
                    </Link>
                  )
                ) : (
                  <Text fontSize="sm" color="blue.300">
                    File data not available
                  </Text>
                )}
              </Box>
            );
          }
          if (isTextUIPart(part)) {
            const textPart = part as TextPart & {
              citations?: Array<{
                id?: string;
                title?: string;
                url?: string;
                snippet?: string;
              }>;
              toolCallId?: string;
              toolName?: string;
              toolInput?: unknown;
              toolOutput?: unknown;
              searchResults?: Array<{
                title?: string;
                url?: string;
                snippet?: string;
              }>;
            };
            return (
              <Box key={index}>
                <MarkdownRenderer
                  content={textPart.text ?? ''}
                  fontSize="sm"
                  color="gray.100"
                />
                {/* Display citations */}
                {textPart.citations && textPart.citations.length > 0 && (
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
                      {textPart.citations.map((citation, idx) => (
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
                              {citation.title ||
                                citation.id ||
                                `Citation ${idx + 1}`}
                            </Link>
                          ) : (
                            <Text fontSize="sm" color="cyan.300">
                              {citation.title ||
                                citation.id ||
                                `Citation ${idx + 1}`}
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
                {textPart.toolName &&
                  (() => {
                    const sectionId = `tool-${message.id}-${index}`;
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
                          onClick={() => toggleSection(sectionId)}
                          _hover={{
                            bg: 'rgba(250, 204, 21, 0.15)',
                          }}
                          mx={-1}
                          transition="background-color 0.05s linear"
                        >
                          <Text
                            fontSize="xs"
                            color="yellow.300"
                            fontWeight={600}
                            letterSpacing="0.1em"
                            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                            textTransform="uppercase"
                          >
                            [TOOL: {textPart.toolName}]
                          </Text>
                          <IconButton
                            aria-label={
                              isCollapsed
                                ? 'Expand tool call'
                                : 'Collapse tool call'
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
                          <Box
                            css={{
                              display: 'block',
                            }}
                          >
                            {textPart.toolInput !== undefined && (
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
                                  {typeof textPart.toolInput === 'string'
                                    ? textPart.toolInput
                                    : JSON.stringify(
                                        textPart.toolInput,
                                        null,
                                        2
                                      )}
                                </Text>
                              </Box>
                            )}
                            {textPart.toolOutput !== undefined && (
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
                                  {typeof textPart.toolOutput === 'string'
                                    ? textPart.toolOutput
                                    : JSON.stringify(
                                        textPart.toolOutput,
                                        null,
                                        2
                                      )}
                                </Text>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })()}
                {/* Display web search results */}
                {textPart.searchResults &&
                  textPart.searchResults.length > 0 &&
                  (() => {
                    const sectionId = `search-${message.id}-${index}`;
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
                          onClick={() => toggleSection(sectionId)}
                          _hover={{
                            bg: 'rgba(16, 185, 129, 0.15)',
                          }}
                          p={1}
                          mx={-1}
                          transition="background-color 0.05s linear"
                        >
                          <Text
                            fontSize="xs"
                            color="emerald.300"
                            fontWeight={600}
                            letterSpacing="0.1em"
                            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
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
                          <Box
                            css={{
                              display: 'block',
                            }}
                          >
                            <VStack gap={2} align="stretch">
                              {textPart.searchResults.map((result, idx) => (
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
                                    <Text
                                      fontSize="xs"
                                      color="emerald.200"
                                      mt={1}
                                    >
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
          }
          if (isToolOrDynamicToolUIPart(part)) {
            // Type guard narrows to ToolUIPart
            const toolPart = part;
            const toolName = getToolOrDynamicToolName(toolPart);
            if (
              toolName === 'queryKnowledgeGraph' ||
              toolName === 'queryAssociativeMemory'
            ) {
              return (
                <MemoryIndicator
                  key={index}
                  toolName={toolName}
                  state={toolPart.state}
                  output={
                    toolPart.state === 'output-available' &&
                    'output' in toolPart &&
                    toolPart.output
                      ? String(toolPart.output)
                      : undefined
                  }
                />
              );
            }
          }
          return null;
        })}
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
