/**
 * ErrorAlert.tsx — Dismissible error banner with copy-to-clipboard diagnostics.
 *
 * @module components/chat/shared/ErrorAlert
 */

import { Box, IconButton } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import type { JSX } from 'react';
import { HiCheck, HiClipboard, HiX } from 'react-icons/hi';
import type { InterlocutorChatError } from '@/hooks/useInterlocutorChat';

function buildErrorCopyText(error: InterlocutorChatError): string {
  const lines = [
    error.code || 'ERROR',
    error.message,
    ...(error.suggestion ? [error.suggestion] : []),
    ...(error.stack ? ['', '--- Stack ---', error.stack] : []),
  ];
  return lines.join('\n');
}

export function ErrorAlert({
  error,
  onClose,
}: {
  readonly error: InterlocutorChatError;
  readonly onClose: () => void;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    const text = buildErrorCopyText(error);
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [error]);

  return (
    <Box
      p={3}
      bg="rgba(239, 68, 68, 0.15)"
      borderBottom="1px solid"
      borderColor="rgba(239, 68, 68, 0.3)"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap={2}
      >
        <Box flex={1} minW={0}>
          <Box
            fontSize="xs"
            color="red.400"
            fontWeight={600}
            letterSpacing="0.05em"
            mb={1}
          >
            {error.code || 'ERROR'}
          </Box>
          <Box fontSize="xs" color="red.300">
            {error.message}
          </Box>
          {error.suggestion && (
            <Box fontSize="xs" color="gray.400" mt={1}>
              {error.suggestion}
            </Box>
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton
            aria-label={copied ? 'Copied' : 'Copy error'}
            size="xs"
            variant="ghost"
            color={copied ? 'green.400' : 'gray.500'}
            _hover={{ color: copied ? 'green.300' : 'gray.300' }}
            onClick={handleCopy}
            transition="all 0.2s ease"
          >
            {copied ? <HiCheck /> : <HiClipboard />}
          </IconButton>
          <IconButton
            aria-label="Dismiss"
            size="xs"
            variant="ghost"
            color="gray.500"
            _hover={{ color: 'gray.300' }}
            onClick={onClose}
          >
            <HiX />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
