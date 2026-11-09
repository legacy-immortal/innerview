/**
 * messageBubbleFilePart.tsx — Renders an attached-file part inside a message bubble.
 *
 * @module components/chat/condensed/messageBubbleFilePart
 */

import { Box, Link, Text } from '@chakra-ui/react';
import type { JSX } from 'react';

interface FilePartProps {
  readonly part: Record<string, unknown> & { readonly url?: string };
  readonly index: number;
}

/** Renders a single attached-file part of a message bubble. */
export const FilePart = ({ part, index }: FilePartProps): JSX.Element => {
  const fileUrl = 'url' in part ? String(part.url ?? '') : '';
  const isDataUrl = fileUrl.startsWith('data:');
  return (
    <Box
      key={index}
      mb={2}
      p={3}
      borderRadius="md"
      bg="rgba(59, 130, 246, 0.1)"
      borderLeft="2px solid"
      borderColor="blue.400"
      css={{
        '&:last-child': {
          marginBottom: 0,
        },
      }}
    >
      <Text
        fontSize="xs"
        color="blue.300"
        fontWeight={600}
        mb={1}
        letterSpacing="0.05em"
      >
        FILE
      </Text>
      <Text fontSize="sm" color="blue.200" mb={1}>
        {'filename' in part
          ? (part.filename as string) || 'Untitled file'
          : 'Untitled file'}
      </Text>
      <Text fontSize="xs" color="blue.300" mb={2}>
        {'mediaType' in part
          ? (part.mediaType as string) || 'application/octet-stream'
          : 'application/octet-stream'}
      </Text>
      {fileUrl ? (
        isDataUrl ? (
          <Link
            href={fileUrl}
            download={
              'filename' in part ? (part.filename as string) : undefined
            }
            color="blue.400"
            textDecoration="underline"
            fontSize="sm"
            _hover={{ color: 'blue.300' }}
          >
            Download file
          </Link>
        ) : (
          <Link
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            color="blue.400"
            textDecoration="underline"
            fontSize="sm"
            _hover={{ color: 'blue.300' }}
          >
            Open file
          </Link>
        )
      ) : (
        <Text fontSize="sm" color="blue.300">
          File data not available
        </Text>
      )}
    </Box>
  );
};
