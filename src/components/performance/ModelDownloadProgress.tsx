// Kokoro/Whisper download progress (extracted from PerformanceDetectionView.tsx).
import {
  formatBytes,
  formatSpeed,
  type ModelDownloadProgress,
} from '@/lib/model-preloader';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';

interface ModelProgressRowProps {
  label: string;
  progress: ModelDownloadProgress;
  tierColor: string;
}

/**
 * One model's download row: overall %, progress bar, and — when the model
 * reports them — per-file detail (file name, loaded/total bytes), download
 * speed, phase, and status/error message.
 */
function ModelProgressRow({
  label,
  progress,
  tierColor,
}: ModelProgressRowProps) {
  const statusColor =
    progress.status === 'complete'
      ? `${tierColor}.400`
      : progress.status === 'error'
        ? 'red.400'
        : 'gray.400';
  const barColor =
    progress.status === 'complete'
      ? `${tierColor}.400`
      : progress.status === 'error'
        ? 'red.400'
        : `${tierColor}.400`;
  const glowRgb =
    progress.status === 'error'
      ? '239, 68, 68'
      : tierColor === 'emerald'
        ? '16, 185, 129'
        : tierColor === 'cyan'
          ? '6, 182, 212'
          : '156, 163, 175';

  const hasFileDetail =
    (progress.file !== null && progress.file !== undefined) ||
    (progress.loaded !== undefined && progress.loaded > 0) ||
    (progress.total !== undefined && progress.total > 0);
  const speedText = formatSpeed(progress.bytesPerSecond ?? 0);
  const sizeText =
    progress.total !== undefined && progress.total > 0
      ? `${formatBytes(progress.loaded ?? 0)} / ${formatBytes(progress.total)}`
      : progress.loaded !== undefined && progress.loaded > 0
        ? formatBytes(progress.loaded)
        : '';
  const detailLine = [
    progress.file ?? null,
    sizeText || null,
    speedText || null,
    progress.filesCompleted !== undefined && progress.filesCompleted > 0
      ? `${progress.filesCompleted} file(s) done`
      : null,
  ]
    .filter((part): part is string => part !== null && part !== '')
    .join('  ·  ');

  return (
    <Box>
      <HStack gap={2} mb={1} justify="space-between">
        <Text
          fontSize="xs"
          color={statusColor}
          letterSpacing="0.05em"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {label}
        </Text>
        <Text fontSize="xs" color="gray.500" letterSpacing="0.1em">
          {progress.progress}%
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
          bg={barColor}
          width={`${progress.progress}%`}
          transition="width 0.2s ease-out"
          css={{
            boxShadow: `0 0 4px rgba(${glowRgb}, 0.5)`,
          }}
        />
      </Box>
      {hasFileDetail && (
        <Text
          fontSize="xs"
          color="gray.500"
          letterSpacing="0.02em"
          mt={1}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {detailLine}
        </Text>
      )}
      {(progress.message || progress.error || progress.phase) && (
        <Text
          fontSize="xs"
          color={progress.error ? 'red.300' : 'gray.400'}
          letterSpacing="0.02em"
          mt={hasFileDetail ? 0 : 1}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {progress.error ??
            progress.message ??
            (progress.phase === 'loading' ? 'Loading model...' : '')}
        </Text>
      )}
    </Box>
  );
}

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
        <ModelProgressRow
          label="Kokoro TTS"
          progress={kokoroProgress}
          tierColor={tierColor}
        />
      )}

      {whisperProgress && (
        <ModelProgressRow
          label="Whisper Transcription"
          progress={whisperProgress}
          tierColor={tierColor}
        />
      )}
    </VStack>
  );
}
