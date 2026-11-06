import { Text } from '@chakra-ui/react';

interface MemoryIndicatorProps {
  toolName: string;
  state?: string;
  output?: string;
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
