/**
 * @file useTerminalCommands.ts — Hook dispatching terminal input to mode-specific command handlers.
 * @module components/chat/terminal/useTerminalCommands
 *
 * Hook dispatching terminal input to mode-specific command handlers. Builds the command map,
 * prompt label, and sorted conversations for the active mode (filesystem, conversation-preview,
 * or conversation-active). Consumed by `TerminalChat`.
 */

import { useConversationStore } from '@/lib/conversation-store';
import { useCallback, useMemo } from 'react';
import type Terminal from 'react-console-emulator';
import type { RefObject } from 'react';
import {
  createCommandModeCommands,
  type CommandDefinition,
} from './commands/commandModeCommands';
import { createConversationDetailModeCommands } from './commands/conversationDetailModeCommands';
import { createConversationModeCommands } from './commands/conversationModeCommands';
import { useTerminalFormatting } from './terminalFormatting';
import type {
  TerminalConversationSummary,
  TerminalMode,
} from './terminalTypes';

interface UseTerminalCommandsOptions {
  readonly mode: TerminalMode;
  readonly conversations: TerminalConversationSummary[];
  readonly detailConversationId: string | null;
  readonly setMode: (mode: TerminalMode) => void;
  readonly setDisplayedMessageIds: (ids: Set<string>) => void;
  readonly setDetailConversationId: (id: string | null) => void;
  readonly onConversationLoad: (conversationId: string) => void;
  readonly onCreateConversation: () => void;
  readonly onExitToChat?: () => void;
  readonly terminalRef: RefObject<InstanceType<typeof Terminal> | null>;
}

/**
 * Hook dispatching terminal input to mode-specific command handlers.
 *
 * @param options - Terminal commands hook options.
 * @returns Commands map, prompt label, and sorted conversations.
 */
export const useTerminalCommands = ({
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
}: UseTerminalCommandsOptions): {
  commands: Record<string, CommandDefinition>;
  promptLabel: string;
  sortedConversations: TerminalConversationSummary[];
} => {
  const deleteConversation = useConversationStore(
    (state) => state.deleteConversation
  );
  const getCurrentConversationId = useConversationStore(
    (state) => state.getCurrentConversationId
  );
  const loadConversationMessagesRaw = useConversationStore(
    (state) => state.loadConversationMessages
  );

  // Wrapper to ensure we always return an array
  const loadConversationMessages = useCallback(
    (id: string) => {
      return loadConversationMessagesRaw(id) || [];
    },
    [loadConversationMessagesRaw]
  );

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversations]);

  const { formatConversationsListCallback, formatConversationsTreeCallback } =
    useTerminalFormatting(sortedConversations);

  // Get current conversation for detail mode
  const currentDetailConversation = useMemo(() => {
    if (!detailConversationId) return null;
    return (
      sortedConversations.find((c) => c.id === detailConversationId) || null
    );
  }, [detailConversationId, sortedConversations]);

  // Get messages for detail mode conversation
  const detailConversationMessages = useMemo(() => {
    if (!detailConversationId) return [];
    return loadConversationMessages(detailConversationId);
  }, [detailConversationId, loadConversationMessages]);

  // Define commands based on current mode
  const commands = useMemo(() => {
    if (mode === 'conversation-active') {
      // Conversation-active mode commands
      return createConversationModeCommands({
        sortedConversations,
        formatConversationsList: formatConversationsListCallback,
        getCurrentConversationId,
        setMode,
        setDisplayedMessageIds,
        clearStdout: () => terminalRef.current?.clearStdout(),
        onExitToChat,
      });
    }

    if (mode === 'conversation-preview') {
      // Conversation-preview mode commands
      return createConversationDetailModeCommands({
        currentConversation: currentDetailConversation,
        conversationMessages: detailConversationMessages,
        onConversationLoad,
        setMode,
        setDisplayedMessageIds,
        clearStdout: () => terminalRef.current?.clearStdout(),
        onExitToChat,
      });
    }

    // Filesystem mode commands
    return createCommandModeCommands({
      sortedConversations,
      formatConversationsList: formatConversationsListCallback,
      formatConversationsTree: formatConversationsTreeCallback,
      loadConversationMessages,
      onConversationLoad,
      onCreateConversation,
      deleteConversation,
      setMode,
      setDisplayedMessageIds,
      setDetailConversationId,
      onExitToChat,
    });
  }, [
    mode,
    onExitToChat,
    sortedConversations,
    formatConversationsListCallback,
    formatConversationsTreeCallback,
    loadConversationMessages,
    onConversationLoad,
    onCreateConversation,
    deleteConversation,
    getCurrentConversationId,
    currentDetailConversation,
    detailConversationMessages,
    setMode,
    setDisplayedMessageIds,
    setDetailConversationId,
    terminalRef,
  ]);

  // Determine prompt label based on mode
  const promptLabel = useMemo(() => {
    if (mode === 'conversation-active') {
      return '> ';
    }
    if (mode === 'conversation-preview') {
      return 'root@innerview:conversation# ';
    }
    if (mode === 'conversation-selection') {
      return 'root@innerview:~# ';
    }
    // filesystem mode (default)
    return 'root@innerview:~# ';
  }, [mode]);

  return { commands, promptLabel, sortedConversations };
};
