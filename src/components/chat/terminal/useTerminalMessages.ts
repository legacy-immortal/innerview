/**
 * @file useTerminalMessages.ts — Hook preparing messages for terminal display (welcome + history).
 * @module components/chat/terminal/useTerminalMessages
 *
 * Hook preparing messages for terminal display (welcome + history). Pushes new user/assistant
 * messages to the terminal stdout once each, shows a "thinking…" indicator while loading, and
 * exposes `resetDisplayedMessages` for mode switches. Consumed by `TerminalChat`.
 */

import { markdownToTerminal } from '@/utils/markdown-to-terminal';
import type { UIMessage } from 'ai';
import { isTextUIPart } from 'ai';
import { useCallback, useEffect, useState } from 'react';
import type Terminal from 'react-console-emulator';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { TerminalMode } from './terminalTypes';

interface UseTerminalMessagesOptions {
  readonly messages: UIMessage[];
  readonly mode: TerminalMode;
  readonly isLoading: boolean;
  readonly terminalRef: RefObject<InstanceType<typeof Terminal> | null>;
}

/**
 * Display new messages in terminal and the loading indicator.
 * Returns helpers used when switching modes.
 *
 * @param options - Terminal messages hook options.
 * @returns Displayed message ids and helpers used when switching modes.
 */
export const useTerminalMessages = ({
  messages,
  mode,
  isLoading,
  terminalRef,
}: UseTerminalMessagesOptions): {
  displayedMessageIds: Set<string>;
  setDisplayedMessageIds: Dispatch<SetStateAction<Set<string>>>;
  resetDisplayedMessages: () => void;
} => {
  const [displayedMessageIds, setDisplayedMessageIds] = useState<Set<string>>(
    new Set()
  );

  // Display new messages in terminal
  useEffect(() => {
    if (!terminalRef.current || mode !== 'conversation-active') return;

    messages.forEach((message) => {
      if (displayedMessageIds.has(message.id)) return;

      const text =
        message.parts
          ?.filter((part) => part != null && isTextUIPart(part))
          .map((part) => part?.text ?? '')
          .join('\n') || '';

      if (!text) return;

      if (message.role === 'user') {
        const userText = typeof text === 'string' ? text : String(text);
        terminalRef.current?.pushToStdout(`> ${userText}`);
      } else if (message.role === 'assistant') {
        // Convert markdown to terminal-friendly text
        const terminalText = markdownToTerminal(text);
        // Ensure it's a string before pushing
        const safeText =
          typeof terminalText === 'string'
            ? terminalText
            : String(terminalText);
        if (safeText) {
          terminalRef.current?.pushToStdout(safeText);
        }
      }

      setDisplayedMessageIds((prev) => new Set(prev).add(message.id));
    });
  }, [messages, mode, displayedMessageIds, terminalRef]);

  // Display loading indicator
  useEffect(() => {
    if (!terminalRef.current || mode !== 'conversation-active' || !isLoading)
      return;
    terminalRef.current.pushToStdout('thinking...');
  }, [isLoading, mode, terminalRef]);

  const resetDisplayedMessages = useCallback(() => {
    setDisplayedMessageIds(new Set());
  }, []);

  return {
    displayedMessageIds,
    setDisplayedMessageIds,
    resetDisplayedMessages,
  };
};
