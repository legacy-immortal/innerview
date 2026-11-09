/**
 * MemoryIndicator.tsx — Compact memory/system indicator chip for the chat header.
 *
 * @module components/chat/shared/MemoryIndicator
 */

import { Text } from '@chakra-ui/react';

interface MemoryIndicatorProps {
  readonly toolName: string;
  readonly state?: string;
  readonly output?: string;
}

export const MemoryIndicator = ({
  toolName,
  state,
  output,
}: MemoryIndicatorProps) => {
  if (state !== 'output-available' || !output) return null;

  const toolLabel =
    toolName === 'queryKnowledgeGraph' ? 'recalling' : 'associating';

  return (
    <Text fontSize="xs" color="gray.400" fontStyle="italic" mt={1}>
      ({toolLabel}: {output})
    </Text>
  );
};
