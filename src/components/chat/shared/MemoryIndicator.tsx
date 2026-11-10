/**
 * @file MemoryIndicator.tsx — Compact memory/system indicator chip for the chat header.
 * @module components/chat/shared/MemoryIndicator
 *
 * Compact memory/system indicator chip for the chat header. Renders nothing unless the tool
 * state is `output-available` with output, labeling knowledge-graph queries as "recalling" and
 * associative-memory queries as "associating". Consumed by `MessageBubblePart`.
 */

import { Text } from '@chakra-ui/react';
import type { JSX } from 'react';

interface MemoryIndicatorProps {
  readonly toolName: string;
  readonly state?: string;
  readonly output?: string;
}

/**
 * Compact memory/system indicator chip for the chat header.
 *
 * @param props - Memory indicator props.
 * @returns The indicator element, or `null` when no output is available.
 */
export const MemoryIndicator = ({
  toolName,
  state,
  output,
}: MemoryIndicatorProps): JSX.Element | null => {
  if (state !== 'output-available' || !output) return null;

  const toolLabel =
    toolName === 'queryKnowledgeGraph' ? 'recalling' : 'associating';

  return (
    <Text fontSize="xs" color="gray.400" fontStyle="italic" mt={1}>
      ({toolLabel}: {output})
    </Text>
  );
};
