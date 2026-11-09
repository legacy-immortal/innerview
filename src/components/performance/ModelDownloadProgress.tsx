// Kokoro/Whisper download progress (extracted from PerformanceDetectionView.tsx).
import type { ModelDownloadProgress } from '@/lib/model-preloader';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';

export function ModelDownloadProgressView({
  kokoroProgress,
  whisperProgress,
  tierColor,
}: {
  kokoroProgress: ModelDownloadProgress | null;
  whisperProgress: ModelDownloadProgress | null;
  tierColor: string;
}) {
  if (!kokoroProgress && !whisperProgress) return null;
  return (
    <VStack gap={2} align="stretch" mt={4}>
      {kokoroProgress && (
        <Box>
          <HStack gap={2} mb={1}>
            <Text
              fontSize="xs"
              color={
                kokoroProgress.status === 'complete'
                  ? `${tierColor}.400`
                  : kokoroProgress.status === 'error'
                    ? 'red.400'
                    : 'gray.400'
              }
              letterSpacing="0.05em"
            >
              Kokoro TTS
            </Text>
            <Text fontSize="xs" color="gray.500" letterSpacing="0.1em">
              {kokoroProgress.progress}%
            </Text>
          </HStack>
          <Box
            w="100%"
            h="2px"
            bg="rgba(255, 255, 255, 0.05)"
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            borderRadius="none"
            position="relative"
            overflow="hidden"
          >
            <Box
              h="100%"
              bg={
                kokoroProgress.status === 'complete'
                  ? `${tierColor}.400`
                  : kokoroProgress.status === 'error'
                    ? 'red.400'
                    : `${tierColor}.400`
              }
              width={`${kokoroProgress.progress}%`}
              transition="width 0.2s ease-out"
              css={{
                boxShadow: `0 0 4px rgba(${
                  kokoroProgress.status === 'error'
                    ? '239, 68, 68'
                    : tierColor === 'emerald'
                      ? '16, 185, 129'
                      : tierColor === 'cyan'
                        ? '6, 182, 212'
                        : '156, 163, 175'
                }, 0.5)`,
              }}
            />
          </Box>
        </Box>
      )}

      {whisperProgress && (
        <Box>
          <HStack gap={2} mb={1}>
            <Text
              fontSize="xs"
              color={
                whisperProgress.status === 'complete'
                  ? `${tierColor}.400`
                  : whisperProgress.status === 'error'
                    ? 'red.400'
                    : 'gray.400'
              }
              letterSpacing="0.05em"
            >
              Whisper Transcription
            </Text>
            <Text fontSize="xs" color="gray.500" letterSpacing="0.1em">
              {whisperProgress.progress}%
            </Text>
          </HStack>
          <Box
            w="100%"
            h="2px"
            bg="rgba(255, 255, 255, 0.05)"
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            borderRadius="none"
            position="relative"
            overflow="hidden"
          >
            <Box
              h="100%"
              bg={
                whisperProgress.status === 'complete'
                  ? `${tierColor}.400`
                  : whisperProgress.status === 'error'
                    ? 'red.400'
                    : `${tierColor}.400`
              }
              width={`${whisperProgress.progress}%`}
              transition="width 0.2s ease-out"
              css={{
                boxShadow: `0 0 4px rgba(${
                  whisperProgress.status === 'error'
                    ? '239, 68, 68'
                    : tierColor === 'emerald'
                      ? '16, 185, 129'
                      : tierColor === 'cyan'
                        ? '6, 182, 212'
                        : '156, 163, 175'
                }, 0.5)`,
              }}
            />
          </Box>
        </Box>
      )}
    </VStack>
  );
}
