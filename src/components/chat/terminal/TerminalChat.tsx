/**
 * @file TerminalChat.tsx — Terminal chat renderer interpreting mode-aware input commands.
 * @module components/chat/terminal/TerminalChat
 *
 * Terminal chat renderer interpreting mode-aware input commands. Manages filesystem,
 * conversation-selection, conversation-preview, and conversation-active modes, routing unknown
 * input to `onPromptSubmit` only in conversation-active mode. Re-exports `TerminalChatProps`
 * and `TerminalMode`. Consumed by `TerminalModeView`.
 */

import { Box } from '@chakra-ui/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Terminal from 'react-console-emulator';
import {
  TerminalExitButton,
  TERMINAL_SCROLLBAR_STYLES,
} from './TerminalExitButton';
import { generateSystemInfo } from './terminalSystemInfo';
import type { TerminalChatProps, TerminalMode } from './terminalTypes';
import { useTerminalCommands } from './useTerminalCommands';
import { useTerminalMessages } from './useTerminalMessages';
import { useTerminalWelcome } from './useTerminalWelcome';

export type { TerminalChatProps, TerminalMode } from './terminalTypes';

/**
 * Terminal chat renderer interpreting mode-aware input commands.
 *
 * @param props - Terminal chat props.
 * @returns The terminal chat element.
 */
export const TerminalChat = ({
  messages,
  isLoading,
  isLoadingMessages: _isLoadingMessages,
  onPromptSubmit,
  conversations,
  onConversationLoad,
  onCreateConversation,
  onExitToChat,
}: TerminalChatProps): React.JSX.Element => {
  // Start in conversation-active mode if there are messages, otherwise filesystem mode
  const [mode, setMode] = useState<TerminalMode>(
    messages.length > 0 ? 'conversation-active' : 'filesystem'
  );
  // Track the conversation being viewed in detail mode
  const [detailConversationId, setDetailConversationId] = useState<
    string | null
  >(null);
  const terminalRef = useRef<InstanceType<typeof Terminal> | null>(null);
  const [systemInfo] = useState(() => generateSystemInfo());

  useTerminalWelcome(mode, systemInfo, terminalRef);
  const { setDisplayedMessageIds, resetDisplayedMessages } =
    useTerminalMessages({ messages, mode, isLoading, terminalRef });

  const { commands, promptLabel } = useTerminalCommands({
    mode,
    conversations,
    detailConversationId,
    setMode,
    setDisplayedMessageIds,
    setDetailConversationId,
    onConversationLoad,
    onCreateConversation,
    onExitToChat,
    terminalRef,
  });

  // Switch to conversation-active mode when messages appear
  useEffect(() => {
    if (messages.length > 0 && mode === 'filesystem') {
      setMode('conversation-active');
    }
  }, [messages.length, mode]);

  // Handle command execution callback
  const handleCommandCallback = useCallback(
    (commandData: {
      command: string;
      args: string[];
      rawInput: string;
      result: unknown;
    }) => {
      // ONLY in conversation-active mode should we treat input as prompts
      // In conversation-preview mode and filesystem mode, input is ALWAYS commands, never prompts
      if (mode !== 'conversation-active') {
        // Explicitly prevent any prompt submission in non-conversation-active modes
        return;
      }

      // Only in conversation-active mode: treat unknown commands as chat messages
      const input = commandData.rawInput.trim();
      // Only submit if it's not a known command
      // Get known commands from current command set
      const knownCommands = Object.keys(commands);
      if (input && !knownCommands.includes(commandData.command)) {
        onPromptSubmit(input);
      }
    },
    [mode, onPromptSubmit, commands]
  );

  // Reset displayed messages when switching modes
  useEffect(() => {
    resetDisplayedMessages();
    // Clear detail conversation ID when leaving conversation-preview mode
    if (mode !== 'conversation-preview') {
      setDetailConversationId(null);
    }
  }, [mode, resetDisplayedMessages]);

  // Use default font size (could be made configurable via settings later)
  const fontSize = '0.875rem';

  // Prevent click events from triggering unwanted behavior
  const handleTerminalClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Stop propagation to prevent parent click handlers from firing
      // This prevents clicks from accidentally loading conversations
      e.stopPropagation();
      // Don't prevent default - allow normal terminal focus/click behavior
    },
    []
  );

  // Use react-console-emulator for all modes
  return (
    <Box
      h="100dvh"
      w="100%"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="sm"
      bg="transparent"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      onClick={handleTerminalClick}
      onMouseDown={handleTerminalClick}
    >
      {onExitToChat && <TerminalExitButton onExitToChat={onExitToChat} />}
      <style>{TERMINAL_SCROLLBAR_STYLES}</style>
      <Terminal
        ref={terminalRef}
        commands={commands}
        welcomeMessage={false}
        promptLabel={promptLabel}
        autoFocus
        commandCallback={handleCommandCallback}
        noDefaults={true}
        style={{
          backgroundColor: 'transparent',
          color: '#e5e7eb',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: fontSize,
          height: '100dvh',
          maxHeight: '100dvh',
          width: '100%',
          maxWidth: '100%',
        }}
        contentStyle={{
          backgroundColor: 'transparent',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#e5e7eb',
        }}
        promptLabelStyle={{
          color: '#e5e7eb',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        inputStyle={{
          backgroundColor: 'transparent',
          color: '#e5e7eb',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        inputTextStyle={{
          color: '#e5e7eb',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        errorText={
          // Suppress "Command not found" errors in conversation-active mode (input becomes prompts)
          // Show errors in conversation-preview and filesystem modes (input must be commands)
          mode === 'conversation-active'
            ? ''
            : "Command not found. Type '?' or 'help' for available commands."
        }
      />
    </Box>
  );
};
