import { Box, Text, VStack } from '@chakra-ui/react';
import type { ReactElement } from 'react';

/**
 * @file TerminalImportProgress.tsx — terminal-style full-screen import
 * progress loader with a text-based progress bar.
 * @module components/animations/TerminalImportProgress
 *
 * Renders a black full-screen overlay showing the current import step, a
 * chunky `█`/`░` progress bar, elapsed time, and optional title/message/
 * subtitle text. Renders nothing when hidden.
 */

/** Number of blocks in the text progress bar. */
const PROGRESS_BAR_BLOCKS = 20;

/** Props for the terminal import progress overlay. */
interface TerminalImportProgressProps {
  /**
   * Current step description
   */
  readonly currentStep: string;

  /**
   * Current progress value
   */
  readonly progress: number;

  /**
   * Total number of steps
   */
  readonly totalSteps: number;

  /**
   * Whether the loader is visible
   */
  readonly isVisible: boolean;

  /**
   * Title text displayed at the top
   * @default 'IMPORT'
   */
  readonly title?: string;

  /**
   * Main message displayed below the title
   * @default ''
   */
  readonly message?: string;

  /**
   * Subtitle message displayed below main message
   * @default ''
   */
  readonly subtitle?: string;
}

/**
 * Terminal-style full-screen import progress loader
 * Features text-based progress bar with █ and ░ characters
 * and full-screen overlay for import operations
 * @param props - Import step, progress, and overlay texts.
 * @returns The progress overlay element, or null when hidden.
 */
export function TerminalImportProgress({
  currentStep,
  progress,
  totalSteps,
  isVisible,
  title = 'IMPORT',
  message = '',
  subtitle = '',
}: TerminalImportProgressProps): ReactElement | null {
  if (!isVisible) return null;

  const completionRatio = totalSteps > 0 ? progress / totalSteps : 0;
  const progressPercent = Math.round(completionRatio * 100);
  const filledBlocks = Math.floor(completionRatio * PROGRESS_BAR_BLOCKS);
  const progressBar =
    '█'.repeat(filledBlocks) + '░'.repeat(PROGRESS_BAR_BLOCKS - filledBlocks);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="black"
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      fontSize="sm"
      color="white"
    >
      <VStack
        gap={4}
        align="center"
        w="min(420px, calc(100vw - 2rem))"
        maxW="100%"
        px={2}
      >
        <Box textAlign="center" w="100%" maxW="100%" overflow="hidden">
          <Text fontSize="lg" mb={2} color="cyan.400">
            {title}
          </Text>
          <Text
            color="gray.300"
            mb={4}
            h="1.6em"
            lineHeight="1.6em"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            display="block"
            w="100%"
            maxW="100%"
            px={1}
            title={currentStep}
          >
            {currentStep || '\u00A0'}
          </Text>
          <Text fontSize="xs" color="gray.500">
            [
            {new Date().toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
            ]
          </Text>
        </Box>

        <Box w="100%" maxW="360px" textAlign="center" overflow="hidden">
          <Text
            mb={2}
            fontSize="xs"
            color="gray.400"
            h="1.5em"
            lineHeight="1.5em"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            fontVariantNumeric="tabular-nums"
          >
            Progress: {progress}/{totalSteps} ({progressPercent}%)
          </Text>
          <Text
            fontSize="sm"
            fontFamily="monospace"
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.3)',
            }}
          >
            [{progressBar}]
          </Text>
        </Box>

        {(message || subtitle) && (
          <Box textAlign="center" w="100%">
            {message ? (
              <Text fontSize="xs" color="gray.500">
                {message}
              </Text>
            ) : null}
            {subtitle ? (
              <Text fontSize="xs" color="gray.600" mt={1}>
                {subtitle}
              </Text>
            ) : null}
          </Box>
        )}
      </VStack>
    </Box>
  );
}
