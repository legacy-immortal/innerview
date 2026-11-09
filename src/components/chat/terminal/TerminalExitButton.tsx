/**
 * TerminalExitButton.tsx — Button to exit the terminal layout back to chat.
 *
 * @module components/chat/terminal/TerminalExitButton
 */

import { Button } from '@chakra-ui/react';

interface TerminalExitButtonProps {
  readonly onExitToChat: () => void;
}

export const TerminalExitButton = ({
  onExitToChat,
}: TerminalExitButtonProps) => (
  <Button
    position="fixed"
    top={3}
    right={3}
    zIndex={101}
    size="xs"
    variant="ghost"
    color="gray.400"
    fontFamily="'JetBrains Mono', monospace"
    _hover={{ color: 'gray.200', bg: 'rgba(255,255,255,0.06)' }}
    onClick={(e) => {
      e.stopPropagation();
      onExitToChat();
    }}
    onMouseDown={(e) => e.stopPropagation()}
  >
    Exit to chat
  </Button>
);

export const TERMINAL_SCROLLBAR_STYLES = `
  /* Terminal scrollbar styling */
   *::-webkit-scrollbar {
    width: 8px;
  }
   *::-webkit-scrollbar-track {
    background: transparent;
  }
   *::-webkit-scrollbar-thumb {
    background: rgba(229, 231, 235, 0.3);
    border-radius: 4px;
    border: 1px solid rgba(229, 231, 235, 0.1);
  }
   *::-webkit-scrollbar-thumb:hover {
    background: rgba(229, 231, 235, 0.5);
  }
   *::-webkit-scrollbar-corner {
    background: transparent;
  }
  /* Firefox scrollbar */
   * {
    scrollbar-width: thin;
    scrollbar-color: rgba(229, 231, 235, 0.3) transparent;
  }
`;
