// Terminal-style performance detection screen (extracted from PerformanceStartup.tsx).
import { Hypnotic } from '@/components/animations/Hypnotic';
import type { ModelDownloadProgress } from '@/lib/model-preloader';
import type { PerformanceMetrics } from '@/lib/performance-detector';
import type { ProviderStatus } from '@/lib/provider-status';
import { DetectionStagesList } from './DetectionStagesList';
import { ModelDownloadProgressView } from './ModelDownloadProgress';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import type { DetectionStage } from '@/lib/performanceStartupUtils';

export interface PerformanceDetectionViewProps {
  metrics: PerformanceMetrics | null;
  stages: DetectionStage[];
  currentStage: number;
  progress: number;
  providerStatus: ProviderStatus | null;
  kokoroProgress: ModelDownloadProgress | null;
  whisperProgress: ModelDownloadProgress | null;
}

export function PerformanceDetectionView({
  metrics,
  stages,
  currentStage,
  progress,
  providerStatus,
  kokoroProgress,
  whisperProgress,
}: PerformanceDetectionViewProps) {
  const showBackground =
    metrics && metrics.tier !== 'low' && metrics.supportsWebGL2;
  const tierColor =
    metrics?.tier === 'high'
      ? 'emerald'
      : metrics?.tier === 'medium'
        ? 'cyan'
        : 'gray';
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="black"
      zIndex={9999}
      overflow="hidden"
    >
      {/* Background animation - only for medium/high tier devices */}
      {showBackground && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          opacity={metrics.tier === 'high' ? 0.3 : 0.15}
        >
          <Hypnotic
            settings={{
              intensity: metrics.tier === 'high' ? 0.4 : 0.2,
              primaryColor1: [0.2, 0.8, 0.6],
              primaryColor2: [0.1, 0.3, 0.2],
              secondaryColor1: [0.3, 0.9, 0.7],
              secondaryColor2: [0.15, 0.4, 0.25],
              tertiaryColor1: [0.25, 0.85, 0.65],
              tertiaryColor2: [0.05, 0.2, 0.15],
              breathingEnabled: true,
              breathingSpeed: 0.5,
              breathingIntensity: 0.1,
              particlesEnabled: metrics.tier === 'high',
              particlesCount: metrics.tier === 'high' ? 20 : 0,
              particlesOpacity: 0.3,
              rotationSpeed1: 0.1,
              rotationSpeed2: 0.15,
              rotationSpeed3: 0.05,
            }}
          />
        </Box>
      )}

      {/* Terminal-style loading interface */}
      <VStack
        gap={4}
        align="stretch"
        w="90%"
        maxW="600px"
        position="relative"
        zIndex={1}
        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      >
        {/* Header */}
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
            color={`${tierColor}.400`}
            fontWeight={600}
            letterSpacing="0.1em"
            css={{
              textShadow: `0 0 8px rgba(${
                tierColor === 'emerald'
                  ? '16, 185, 129'
                  : tierColor === 'cyan'
                    ? '6, 182, 212'
                    : '156, 163, 175'
              }, 0.5), 0 0 16px rgba(${
                tierColor === 'emerald'
                  ? '16, 185, 129'
                  : tierColor === 'cyan'
                    ? '6, 182, 212'
                    : '156, 163, 175'
              }, 0.3)`,
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

        {/* Title */}
        <Text
          fontSize="lg"
          color="gray.200"
          fontWeight={600}
          letterSpacing="0.05em"
          css={{
            textShadow: '0 0 8px rgba(255, 255, 255, 0.1)',
          }}
        >
          PERFORMANCE DETECTION
        </Text>

        <DetectionStagesList
          stages={stages}
          currentStage={currentStage}
          tierColor={tierColor}
        />

        {/* Progress bar */}
        <Box mt={4}>
          <Box
            w="100%"
            h="4px"
            bg="rgba(255, 255, 255, 0.05)"
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            borderRadius="none"
            position="relative"
            overflow="hidden"
          >
            {/* Progress fill */}
            <Box
              h="100%"
              bg={`${tierColor}.400`}
              width={`${progress}%`}
              transition="width 0.2s step-end"
              css={{
                boxShadow: `0 0 8px rgba(${
                  tierColor === 'emerald'
                    ? '16, 185, 129'
                    : tierColor === 'cyan'
                      ? '6, 182, 212'
                      : '156, 163, 175'
                }, 0.5)`,
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '8px',
                  bg: `${tierColor}.300`,
                  boxShadow: `0 0 4px rgba(${
                    tierColor === 'emerald'
                      ? '16, 185, 129'
                      : tierColor === 'cyan'
                        ? '6, 182, 212'
                        : '156, 163, 175'
                  }, 0.8)`,
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
          <Text
            fontSize="xs"
            color="gray.500"
            textAlign="right"
            letterSpacing="0.1em"
            mt={1}
            css={{
              textShadow: '0 0 2px rgba(255, 255, 255, 0.1)',
            }}
          >
            {progress}%
          </Text>
        </Box>

        {/* Status message */}
        <Text
          fontSize="xs"
          color="gray.500"
          letterSpacing="0.05em"
          mt={2}
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.05)',
          }}
        >
          {metrics
            ? `Detected ${metrics.tier.toUpperCase()} performance tier`
            : 'Initializing detection routines...'}
        </Text>

        {/* Provider warning */}
        {providerStatus &&
          providerStatus.status !== 'available' &&
          providerStatus.status !== 'checking' && (
            <Box
              mt={3}
              p={3}
              bg="rgba(239, 68, 68, 0.1)"
              border="1px solid"
              borderColor="rgba(239, 68, 68, 0.3)"
              borderRadius="none"
            >
              <Text
                fontSize="xs"
                color="red.400"
                fontWeight={600}
                letterSpacing="0.05em"
                mb={1}
              >
                AI PROVIDER UNAVAILABLE
              </Text>
              <Text fontSize="xs" color="red.300" letterSpacing="0.02em">
                {providerStatus.error}
              </Text>
              {providerStatus.suggestion && (
                <Text
                  fontSize="xs"
                  color="gray.400"
                  mt={2}
                  letterSpacing="0.02em"
                >
                  {providerStatus.suggestion}
                </Text>
              )}
            </Box>
          )}

        <ModelDownloadProgressView
          kokoroProgress={kokoroProgress}
          whisperProgress={whisperProgress}
          tierColor={tierColor}
        />
      </VStack>
    </Box>
  );
}
