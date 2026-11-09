/**
 * ChatInput.tsx — Prompt input area for the condensed layout, with context meter and transcription.
 *
 * @module components/chat/condensed/ChatInput
 */

import {
  Box,
  HStack,
  HoverCard,
  IconButton,
  Input,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { HiArrowRight } from 'react-icons/hi';
import {
  cursorBlinkStyles,
  headerTextShadowStyles,
  inputStyles,
  promptCharStyles,
} from '../shared/ChatStyles';
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from '../shared/ContextCounter';
import { TranscriptionButton } from '../shared/TranscriptionButton';

interface ChatInputProps {
  readonly input: string;
  readonly onInputChange: (value: string) => void;
  readonly onSubmit: (text: string) => void;
  readonly promptInputBackgroundColor: string;
  readonly sidebarBackgroundColor: string;
  readonly usedTokens: number;
  readonly maxContextTokens: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  readonly onTranscriptionComplete: (text: string) => void;
  /** Start recording (same as keyboard push-to-talk start). */
  readonly onTranscriptionStart?: () => void;
  /** Stop recording and begin transcription. */
  readonly onTranscriptionStop?: () => void;
  /** When true, transcription button is disabled (e.g. while chat is streaming). */
  readonly disableTranscription?: boolean;
  /** When 'corpo': borderless, fully transparent wrapper and input row */
  readonly variant?: 'default' | 'corpo';
  /** External recording state from keyboard shortcut triggered transcription */
  readonly isRecording?: boolean;
  /** External transcribing state */
  readonly isTranscribing?: boolean;
  /** External audio level for visualization */
  readonly audioLevel?: number;
  /** Error from transcription (e.g. from parent hook). */
  readonly transcriptionError?: Error | null;
}

const ChatInputComponent = ({
  input,
  onInputChange,
  onSubmit,
  promptInputBackgroundColor,
  sidebarBackgroundColor,
  usedTokens,
  maxContextTokens,
  tokenUsage,
  onTranscriptionComplete,
  onTranscriptionStart,
  onTranscriptionStop,
  isRecording,
  isTranscribing,
  audioLevel,
  transcriptionError,
  disableTranscription = false,
  variant = 'default',
}: ChatInputProps) => {
  const isCorpo = variant === 'corpo';
  const [promptChar, setPromptChar] = useState<'$' | '>'>('$');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureSpanRef = useRef<HTMLSpanElement>(null);

  // Memoize trimmed input to avoid recalculating
  const trimmedInput = useMemo(() => input.trim(), [input]);
  const hasInput = useMemo(() => trimmedInput.length > 0, [trimmedInput]);

  // Update cursor position using hidden span measurement (tutorial technique)
  // Using direct DOM manipulation for immediate updates (like the tutorial)
  const cursorElementRef = useRef<HTMLDivElement>(null);

  const updateCursorPosition = useCallback(() => {
    if (
      !inputRef.current ||
      !measureSpanRef.current ||
      !cursorElementRef.current ||
      !isFocused
    ) {
      return;
    }

    const inputEl = inputRef.current;
    const measureSpan = measureSpanRef.current;
    const pos = inputEl.selectionStart ?? inputEl.value.length;

    // Set text before cursor in hidden span (tutorial technique)
    const textBeforeCursor = inputEl.value.substring(0, pos);
    measureSpan.textContent = textBeforeCursor || '\u00A0';

    // Use requestAnimationFrame to batch measurement read, then update immediately
    requestAnimationFrame(() => {
      if (measureSpanRef.current && cursorElementRef.current) {
        const left = measureSpanRef.current.offsetWidth;
        // Use translate3d for hardware acceleration (tutorial technique)
        // Direct DOM manipulation for immediate updates
        cursorElementRef.current.style.transform = `translate3d(${left}px, -50%, 0)`;
      }
    });
  }, [isFocused]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (hasInput) {
        onSubmit(input);
        onInputChange('');
      }
    },
    [input, onSubmit, onInputChange, hasInput]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputChange(e.target.value);
      // Update cursor position immediately - no delay
      updateCursorPosition();
    },
    [onInputChange, updateCursorPosition]
  );

  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    // Update cursor position when focused
    requestAnimationFrame(updateCursorPosition);
  }, [updateCursorPosition]);

  const handleInputBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (hasInput) {
          onSubmit(input);
          onInputChange('');
        }
        return;
      }

      // Update cursor for navigation and deletion keys - immediate update
      if (
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key.startsWith('Arrow') ||
        e.key === 'Home' ||
        e.key === 'End'
      ) {
        // Update immediately without RAF delay for deletion keys
        updateCursorPosition();
      }
    },
    [input, onSubmit, onInputChange, hasInput, updateCursorPosition]
  );

  const handleInputClick = useCallback(() => {
    updateCursorPosition();
  }, [updateCursorPosition]);

  const handleInputSelect = useCallback(() => {
    updateCursorPosition();
  }, [updateCursorPosition]);

  // Update cursor position when input changes
  useEffect(() => {
    if (isFocused) {
      updateCursorPosition();
    }
  }, [input, isFocused, updateCursorPosition]);

  return (
    <Box
      position={isCorpo ? 'fixed' : 'absolute'}
      bottom={0}
      left={0}
      right={0}
      p={4}
      borderTop={isCorpo ? 'none' : '1px'}
      borderColor="rgba(255, 255, 255, 0.1)"
      bg={isCorpo ? 'transparent' : sidebarBackgroundColor}
      zIndex={isCorpo ? 15 : undefined}
    >
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <HStack
          align="center"
          gap={2}
          minW={0}
          maxW="100%"
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          fontSize="sm"
          lineHeight="1.6"
          borderBottom={isCorpo ? 'none' : '1px solid'}
          borderColor={isCorpo ? 'transparent' : 'rgba(255, 255, 255, 0.2)'}
          _hover={
            isCorpo ? undefined : { borderColor: 'rgba(255, 255, 255, 0.3)' }
          }
          _focusWithin={
            isCorpo ? undefined : { borderColor: 'rgba(255, 255, 255, 0.4)' }
          }
          transition="border-color 0.2s"
          pb={2}
        >
          <Text
            color="cyan.400"
            fontSize="sm"
            fontWeight={600}
            userSelect="none"
            cursor="pointer"
            onClick={() => setPromptChar(promptChar === '$' ? '>' : '$')}
            css={promptCharStyles}
          >
            {promptChar}
          </Text>
          <Box position="relative" flex={1} minW={0} maxW="100%">
            {/* Hidden span for measuring text width (article technique) */}
            <span
              ref={measureSpanRef}
              style={{
                position: 'absolute',
                visibility: 'hidden',
                whiteSpace: 'pre',
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
                fontSize: '0.875rem',
                lineHeight: '1.6',
                padding: 0,
                margin: 0,
                pointerEvents: 'none',
                top: 0,
                left: 0,
              }}
            />
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              onClick={handleInputClick}
              onSelect={handleInputSelect}
              bg={isCorpo ? 'transparent' : promptInputBackgroundColor}
              color="gray.100"
              border="none"
              borderRadius={0}
              _focus={{
                boxShadow: 'none',
                outline: 'none',
              }}
              w="100%"
              p={0}
              minH="auto"
              css={inputStyles}
            />
            {isFocused && (
              <Box
                ref={cursorElementRef}
                position="absolute"
                left={0}
                top="50%"
                w="0.5em"
                h="1em"
                bg="gray.100"
                css={cursorBlinkStyles}
                style={{
                  willChange: 'transform', // Optimize for hardware acceleration
                  transform: 'translate3d(0, -50%, 0)', // Initial position, updated via direct DOM manipulation
                }}
              />
            )}
          </Box>
          <IconButton
            aria-label="Send message"
            size="sm"
            variant="ghost"
            colorPalette="gray"
            type="submit"
            disabled={!hasInput}
            opacity={hasInput ? 1 : 0.5}
            _hover={{
              bg: 'rgba(255, 255, 255, 0.1)',
              opacity: 1,
            }}
            css={headerTextShadowStyles}
          >
            <HiArrowRight />
          </IconButton>
        </HStack>
      </form>
      <Box mt={2} minW={0} maxW="100%">
        <HStack gap={2} align="center" flexWrap="wrap">
          <Context
            usedTokens={usedTokens}
            maxTokens={maxContextTokens}
            usage={{
              inputTokens: tokenUsage.inputTokens,
              inputTokenDetails: {
                noCacheTokens: tokenUsage.inputTokens,
                cacheReadTokens: undefined,
                cacheWriteTokens: undefined,
              },
              outputTokens: tokenUsage.outputTokens,
              outputTokenDetails: {
                textTokens: tokenUsage.outputTokens,
                reasoningTokens: undefined,
              },
              totalTokens: tokenUsage.totalTokens,
            }}
            modelId="gpt-4o"
          >
            <ContextTrigger size="sm" variant="ghost" />
            <Portal>
              <HoverCard.Positioner>
                <ContextContent>
                  <ContextContentHeader />
                  <ContextContentBody>
                    <VStack gap={2} align="stretch">
                      <ContextInputUsage />
                      <ContextOutputUsage />
                      <ContextReasoningUsage />
                      <ContextCacheUsage />
                    </VStack>
                  </ContextContentBody>
                  <ContextContentFooter />
                </ContextContent>
              </HoverCard.Positioner>
            </Portal>
          </Context>
          <TranscriptionButton
            onTranscriptionComplete={onTranscriptionComplete}
            onStartRecording={onTranscriptionStart}
            onStopRecording={onTranscriptionStop}
            provider="openai"
            size="sm"
            showVisualization={true}
            pushToTalkKey="`"
            enablePushToTalk={false}
            disabled={disableTranscription}
            externalIsRecording={isRecording}
            externalIsTranscribing={isTranscribing}
            externalAudioLevel={audioLevel}
            externalError={transcriptionError}
          />
        </HStack>
      </Box>
    </Box>
  );
};

// Memoize component to prevent unnecessary re-renders when parent updates
export const ChatInput = React.memo(ChatInputComponent);
