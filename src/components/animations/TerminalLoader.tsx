import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { TerminalProgressBar } from './TerminalProgressBar';

/**
 * @file TerminalLoader.tsx — terminal-style loading overlay with staccato
 * progress steps and an animated ellipsis.
 * @module components/animations/TerminalLoader
 *
 * Renders a full-screen black loading overlay with a timestamp, `[SYSTEM]`
 * prompt, a loading message with animated dots, and a staccato progress bar
 * that advances in chunky steps. Renders nothing when not loading.
 */

/** Chunky progress steps (percent) for the staccato loader animation. */
const PROGRESS_STEPS: readonly number[] = [10, 25, 40, 55, 70, 85, 95, 100];

/** Maximum animated dots shown after the loader message. */
const MAX_DOTS = 3;

/** Interval for the staccato progress steps, in milliseconds. */
const PROGRESS_INTERVAL_MS = 100;

/** Interval for the animated dots, in milliseconds. */
const DOTS_INTERVAL_MS = 300;

/** Props for the terminal loader. */
interface TerminalLoaderProps {
  /** Whether the loader is currently visible. */
  readonly isLoading: boolean;
  /** Loading message to display. */
  readonly message?: string;
}

/**
 * Render the terminal loading overlay when loading.
 * @param props - Loading flag and the message to display.
 * @returns The loading overlay element, or null when not loading.
 */
export function TerminalLoader({
  isLoading,
  message = 'LOADING',
}: TerminalLoaderProps): ReactElement | null {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Staccato progress animation - chunky steps
      let currentProgress = 0;
      intervalRef.current = setInterval(() => {
        // Increment in chunky steps (10%, 25%, 40%, etc.)
        const nextStep =
          PROGRESS_STEPS.find((step) => step > currentProgress) ?? 100;
        currentProgress = nextStep;
        setProgress(currentProgress);

        if (currentProgress >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, PROGRESS_INTERVAL_MS); // Staccato timing - abrupt changes

      // Animated dots
      dotsIntervalRef.current = setInterval(() => {
        setDots((prev) => {
          if (prev.length >= MAX_DOTS) return '';
          return `${prev}.`;
        });
      }, DOTS_INTERVAL_MS);
    } else {
      setProgress(0);
      setDots('');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (dotsIntervalRef.current) {
        clearInterval(dotsIntervalRef.current);
        dotsIntervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (dotsIntervalRef.current) {
        clearInterval(dotsIntervalRef.current);
      }
    };
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="black"
      zIndex={20}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
    >
      <VStack gap={4} align="stretch" w="80%" maxW="400px">
        {/* Status text */}
        <HStack gap={2} align="baseline">
          <Text
            fontSize="xs"
            color="gray.500"
            letterSpacing="0.05em"
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
            }}
          >
            {new Date().toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </Text>
          <Text
            fontSize="xs"
            color="emerald.400"
            fontWeight={600}
            letterSpacing="0.1em"
            css={{
              textShadow:
                '0 0 8px rgba(16, 185, 129, 0.5), 0 0 16px rgba(16, 185, 129, 0.3)',
            }}
          >
            [SYSTEM]
          </Text>
          <Text
            fontSize="xs"
            color="gray.400"
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.05)',
            }}
          >
            ›
          </Text>
        </HStack>

        {/* Loading message */}
        <Text
          fontSize="sm"
          color="gray.300"
          letterSpacing="0.05em"
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
          }}
        >
          {message}
          {dots}
        </Text>

        {/* Progress bar */}
        <TerminalProgressBar progress={progress} />
      </VStack>
    </Box>
  );
}
