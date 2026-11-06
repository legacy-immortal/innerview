import { Box, Text } from '@chakra-ui/react';

interface TerminalProgressBarProps {
  /**
   * Progress value from 0 to 100
   */
  progress: number;

  /**
   * Whether to show the percentage text
   * @default true
   */
  showPercentage?: boolean;

  /**
   * Custom color for the progress bar
   * @default 'emerald.400'
   */
  color?: string;

  /**
   * Height of the progress bar
   * @default '4px'
   */
  height?: string;
}

/**
 * Terminal-style progress bar component with chunky block aesthetic
 * Features grid overlay and glowing effect for terminal aesthetic
 */
export const TerminalProgressBar = ({
  progress,
  showPercentage = true,
  color = 'emerald.400',
  height = '4px',
}: TerminalProgressBarProps) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <>
      {/* Progress bar */}
      <Box
        w="100%"
        h={height}
        bg="rgba(255, 255, 255, 0.05)"
        border="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
        borderRadius="none"
        position="relative"
        overflow="hidden"
      >
        {/* Progress fill - chunky blocks */}
        <Box
          h="100%"
          bg={color}
          width={`${clampedProgress}%`}
          transition="width 0.15s step-end"
          css={{
            boxShadow: `0 0 8px ${color === 'emerald.400' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
            // Create chunky block effect
            '&::after': {
              content: '""',
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '8px',
              bg: color === 'emerald.400' ? 'emerald.300' : color,
              boxShadow: `0 0 4px ${color === 'emerald.400' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(255, 255, 255, 0.5)'}`,
            },
          }}
        />
        {/* Grid overlay for terminal aesthetic */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          css={{
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 7px,
                rgba(255, 255, 255, 0.02) 7px,
                rgba(255, 255, 255, 0.02) 8px
              )
            `,
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* Progress percentage */}
      {showPercentage && (
        <Text
          fontSize="xs"
          color="gray.500"
          textAlign="right"
          letterSpacing="0.1em"
          css={{
            textShadow: '0 0 2px rgba(255, 255, 255, 0.1)',
          }}
        >
          {Math.round(clampedProgress)}%
        </Text>
      )}
    </>
  );
};
