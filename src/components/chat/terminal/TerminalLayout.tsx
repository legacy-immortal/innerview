import { Box, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface TerminalLayoutProps {
  children: ReactNode;
}

export const TerminalLayout = ({ children }: TerminalLayoutProps) => {
  return (
    <VStack
      h="100vh"
      w="100vw"
      align="stretch"
      gap={0}
      bg="transparent"
      overflow="hidden"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      position="fixed"
      top={0}
      left={0}
      zIndex={100}
    >
      <Box flex={1} overflow="hidden" position="relative" w="100%" h="100%">
        {children}
      </Box>
    </VStack>
  );
};
