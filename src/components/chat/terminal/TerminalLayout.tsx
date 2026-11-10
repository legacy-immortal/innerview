/**
 * @file TerminalLayout.tsx — Frame (banner + viewport) for the terminal layout.
 * @module components/chat/terminal/TerminalLayout
 *
 * Frame (banner + viewport) for the terminal layout. A fixed fullscreen `VStack` with a single
 * scrollable child box. Consumed by `TerminalModeView`.
 */

import { Box, VStack } from '@chakra-ui/react';
import type { JSX, ReactNode } from 'react';

interface TerminalLayoutProps {
  readonly children: ReactNode;
}

/** Frames terminal content with the session banner and viewport. */
export const TerminalLayout = ({
  children,
}: TerminalLayoutProps): JSX.Element => {
  return (
    <VStack
      h="100dvh"
      w="100%"
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
