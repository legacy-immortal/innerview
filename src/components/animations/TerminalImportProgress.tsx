import { Box, Text, VStack } from '@chakra-ui/react';

interface TerminalImportProgressProps {
  /**
   * Current step description
   */
  currentStep: string;

  /**
   * Current progress value
   */
  progress: number;

  /**
   * Total number of steps
   */
  totalSteps: number;

  /**
   * Whether the loader is visible
   */
  isVisible: boolean;

  /**
   * Title text displayed at the top
   * @default '[DEEPSEEK IMPORT]'
   */
  title?: string;

  /**
   * Main message displayed below the title
   * @default 'Processing DeepSeek conversation data...'
   */
  message?: string;

  /**
   * Subtitle message displayed below main message
   * @default 'This may take a few moments for large files'
   */
  subtitle?: string;
}

/**
 * Terminal-style full-screen import progress loader
 * Features text-based progress bar with █ and ░ characters
 * and full-screen overlay for import operations
 */
export const TerminalImportProgress = ({
  currentStep,
  progress,
  totalSteps,
  isVisible,
  title = '[DEEPSEEK IMPORT]',
  message = 'Processing DeepSeek conversation data...',
  subtitle = 'This may take a few moments for large files',
}: TerminalImportProgressProps) => {
  if (!isVisible) return null;

  const progressPercent = Math.round((progress / totalSteps) * 100);
  const progressBar =
    '█'.repeat(Math.floor((progress / totalSteps) * 20)) +
    '░'.repeat(20 - Math.floor((progress / totalSteps) * 20));

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
      <VStack gap={4} align="center">
        <Box textAlign="center">
          <Text fontSize="lg" mb={2} color="cyan.400">
            {title}
          </Text>
          <Text color="gray.300" mb={4}>
            {currentStep}
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

        <Box w="400px" textAlign="center">
          <Text mb={2} fontSize="xs" color="gray.400">
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

        <Box textAlign="center">
          <Text fontSize="xs" color="gray.500">
            {message}
          </Text>
          <Text fontSize="xs" color="gray.600" mt={1}>
            {subtitle}
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};
