/**
 * @file BackendStatusIndicator.tsx — Live `/api/status` dot shown in ChatHeader.
 * @module components/chat/condensed/BackendStatusIndicator
 *
 * Live `/api/status` dot shown in ChatHeader. Polls backend status every 2 minutes (paused when
 * hidden), renders a color-coded dot with CPU/memory/GPU/requests tooltip, and exposes a refresh
 * handler. Memoized. Consumed by `ChatHeader`.
 */
import { memo } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { Box, Text } from '@chakra-ui/react';

const COLOR_MAP = {
  green: 'green.400',
  yellow: 'yellow.400',
  red: 'red.400',
  gray: 'gray.500',
} as const;

const SHADOW_MAP = {
  green: '0 0 8px rgba(34, 197, 94, 0.6)',
  yellow: '0 0 8px rgba(234, 179, 8, 0.6)',
  red: '0 0 8px rgba(239, 68, 68, 0.6)',
  gray: 'none',
} as const;

function BackendStatusIndicatorComponent(): React.JSX.Element {
  const { status, message, color, refresh } = useBackendStatus();

  const detail = status
    ? [
        `CPU: ${status.cpu.usagePercent ?? '?'}% (${status.cpu.cores} cores, load ${status.cpu.load1})`,
        `Memory: ${status.memory.usagePercent}% (${status.memory.usedMB}/${status.memory.totalMB} MB)`,
        `GPU: ${status.gpu.available ? (status.gpu.name ?? 'available') : 'n/a — ' + status.gpu.note}`,
        `Requests: ${status.requests.active} active, ${status.requests.queued} queued (${status.requests.total} total)`,
        `Models: ${status.models.map((m) => `${m.name}${m.loading ? ' loading' : ''}`).join(', ') || 'none'}`,
      ].join('\n')
    : message;

  return (
    <Tooltip content={detail} positioning={{ placement: 'bottom' }}>
      <Box
        display="flex"
        alignItems="center"
        gap="6px"
        cursor="pointer"
        onClick={() => void refresh()}
        aria-label={`Backend: ${message}`}
      >
        <Box
          w="8px"
          h="8px"
          borderRadius="full"
          bg={COLOR_MAP[color]}
          css={{
            boxShadow: SHADOW_MAP[color],
            animation:
              color === 'yellow' || color === 'red'
                ? 'pulse 2s infinite'
                : 'none',
          }}
        />
        <Text
          fontSize="xs"
          color="gray.400"
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          maxW="160px"
          truncate
        >
          {message}
        </Text>
      </Box>
    </Tooltip>
  );
}

/**
 * Memoized indicator showing backend/model status.
 *
 * @returns The memoized backend status indicator element.
 */
export const BackendStatusIndicator = memo(BackendStatusIndicatorComponent);
