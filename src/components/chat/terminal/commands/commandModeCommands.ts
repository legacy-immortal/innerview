/**
 * @file commandModeCommands.ts — Terminal command-mode command definitions and handlers.
 * @module components/chat/terminal/commands/commandModeCommands
 *
 * Terminal command-mode command definitions and handlers. Defines `CommandDefinition` and the
 * command-mode context, then builds the filesystem command table (`ls`, `load`, `cat`, `rm`,
 * `gui`, `?`, etc.). Consumed by `useTerminalCommands`.
 */

import type {
  Conversation,
  ConversationMessage,
} from '@/lib/conversation-store';

export interface CommandDefinition {
  readonly description: string;
  readonly usage: string;
  readonly fn: (...args: string[]) => string;
}

// Type for conversations that may have optional createdAt and messageCount (for compatibility)
export type ConversationWithOptionalCreatedAt = Omit<
  Conversation,
  'createdAt' | 'messageCount'
> & {
  createdAt?: string;
  messageCount?: number;
};

export interface CommandModeContext {
  readonly sortedConversations: readonly ConversationWithOptionalCreatedAt[];
  readonly formatConversationsList: () => string;
  readonly formatConversationsTree: () => string;
  readonly loadConversationMessages: (id: string) => ConversationMessage[];
  readonly onConversationLoad: (id: string) => void;
  readonly onCreateConversation: () => void;
  readonly deleteConversation: (id: string) => void;
  readonly setMode: (
    mode:
      | 'filesystem'
      | 'conversation-selection'
      | 'conversation-preview'
      | 'conversation-active'
  ) => void;
  readonly setDisplayedMessageIds: (ids: Set<string>) => void;
  readonly setDetailConversationId?: (id: string | null) => void;
  readonly onExitToChat?: () => void;
}

/**
 * Builds the filesystem/command-mode command table.
 *
 * @param context Mode context (store actions + navigation setters).
 * @returns Map from command name to its definition.
 */
export const createCommandModeCommands = (
  context: CommandModeContext
): Record<string, CommandDefinition> => {
  const {
    sortedConversations,
    formatConversationsList,
    formatConversationsTree,
    loadConversationMessages,
    onConversationLoad,
    onCreateConversation,
    deleteConversation,
    setMode,
    setDisplayedMessageIds,
    setDetailConversationId,
    onExitToChat,
  } = context;

  return {
    ls: {
      description: 'List directory contents',
      usage: 'ls',
      fn: () => formatConversationsList(),
    },
    dir: {
      description: 'List directory contents (DOS)',
      usage: 'dir',
      fn: () => formatConversationsList(),
    },
    interlocutor: {
      description: 'Interlocutor-v0.0.1',
      usage: 'interlocutor [options]',
      fn: (...args: string[]) => {
        const argsList = args.filter(Boolean);

        if (argsList.includes('-h') || argsList.includes('--help')) {
          return `Interlocutor - AI Conversation Terminal
Usage: interlocutor [options]
Options:
  -h, --help  Show this help message
  (no args)   Start or select a conversation`;
        }

        // Start conversation selection from filesystem mode
        if (sortedConversations.length === 0) {
          onCreateConversation();
          setMode('conversation-active');
          return 'No conversations found. Starting new conversation...';
        } else {
          // Return formatted conversation list
          const list = sortedConversations
            .map(
              (conv, idx) =>
                `[${idx + 1}] ${conv.title || 'Untitled Conversation'}`
            )
            .join('\n');
          return `Available conversations:\n${list}\n\nUse 'load <number>' or 'open <number>' to load a conversation.`;
        }
      },
    },
    load: {
      description: 'Load a conversation by number',
      usage: 'load <number>',
      fn: (...args: string[]) => {
        const numStr = args[0];
        if (!numStr) {
          return 'Usage: load <number>\nExample: load 1';
        }
        const num = parseInt(numStr, 10);
        if (isNaN(num) || num < 1) {
          return `Invalid conversation number: ${numStr}`;
        }
        // Get conversation directly from sortedConversations to ensure we have the latest data
        const index = num - 1;
        if (index < 0 || index >= sortedConversations.length) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        const conv = sortedConversations[index];
        if (!conv) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        // Transition to preview mode instead of directly to conversation-active mode
        // Ensure we're setting the correct conversation ID from the selected conversation
        if (setDetailConversationId) {
          // Explicitly use the conversation ID from the selected conversation
          setDetailConversationId(conv.id);
        } else {
          // Fallback: directly load if setDetailConversationId is not available
          onConversationLoad(conv.id);
          setMode('conversation-active');
          setDisplayedMessageIds(new Set());
          return `Opened conversation [${num}]: ${conv.title || 'Untitled Conversation'}`;
        }
        setMode('conversation-preview');
        setDisplayedMessageIds(new Set());
        const messages = loadConversationMessages(conv.id);
        const msgCount = messages.length;
        return `Loaded conversation [${num}]: ${conv.title || 'Untitled Conversation'}\n${msgCount > 0 ? `(${msgCount} message${msgCount === 1 ? '' : 's'})\n` : '(No messages yet)\n'}Use 'start', 'enter', or 'begin' to start chatting.`;
      },
    },
    open: {
      description: 'Open a conversation by number',
      usage: 'open <number>',
      fn: (...args: string[]) => {
        const numStr = args[0];
        if (!numStr) {
          return 'Usage: open <number>\nExample: open 1';
        }
        const num = parseInt(numStr, 10);
        if (isNaN(num) || num < 1) {
          return `Invalid conversation number: ${numStr}`;
        }
        // Get conversation directly from sortedConversations to ensure we have the latest data
        const index = num - 1;
        if (index < 0 || index >= sortedConversations.length) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        const conv = sortedConversations[index];
        if (!conv) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        onConversationLoad(conv.id);
        setMode('conversation-active');
        setDisplayedMessageIds(new Set());
        return `Opened conversation [${num}]: ${conv.title || 'Untitled Conversation'}`;
      },
    },
    cat: {
      description: 'Display conversation contents (Unix)',
      usage: 'cat <number>',
      fn: (...args: string[]) => {
        const numStr = args[0];
        if (!numStr) {
          return 'Usage: cat <number>\nExample: cat 1';
        }
        const num = parseInt(numStr, 10);
        if (isNaN(num) || num < 1) {
          return `Invalid conversation number: ${numStr}`;
        }
        // Get conversation directly from sortedConversations to ensure we have the latest data
        const index = num - 1;
        if (index < 0 || index >= sortedConversations.length) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        const conv = sortedConversations[index];
        if (!conv) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        const messages = loadConversationMessages(conv.id);
        if (!messages || messages.length === 0) {
          return `Conversation [${num}]: ${conv.title || 'Untitled Conversation'}\n(No messages yet)`;
        }
        const preview = messages
          .slice(0, 10)
          .map((msg: ConversationMessage) => {
            const content =
              msg.content ||
              msg.parts
                ?.filter((p) => p?.type === 'text')
                .map((p) => p?.text || '')
                .join('\n') ||
              '';
            const role = msg.role === 'user' ? '> ' : '';
            return `${role}${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
          })
          .join('\n');
        return `Conversation [${num}]: ${conv.title || 'Untitled Conversation'}\n${'─'.repeat(60)}\n${preview}\n${messages.length > 10 ? `\n... (${messages.length - 10} more messages)` : ''}`;
      },
    },
    type: {
      description: 'Display conversation contents (DOS)',
      usage: 'type <number>',
      fn: (...args: string[]) => {
        const numStr = args[0];
        if (!numStr) {
          return 'Usage: type <number>\nExample: type 1';
        }
        const num = parseInt(numStr, 10);
        if (isNaN(num) || num < 1) {
          return `Invalid conversation number: ${numStr}`;
        }
        // Get conversation directly from sortedConversations to ensure we have the latest data
        const index = num - 1;
        if (index < 0 || index >= sortedConversations.length) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        const conv = sortedConversations[index];
        if (!conv) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        const messages = loadConversationMessages(conv.id);
        if (!messages || messages.length === 0) {
          return `Conversation [${num}]: ${conv.title || 'Untitled Conversation'}\n(No messages yet)`;
        }
        const preview = messages
          .slice(0, 10)
          .map((msg: ConversationMessage) => {
            const content =
              msg.content ||
              msg.parts
                ?.filter((p) => p?.type === 'text')
                .map((p) => p?.text || '')
                .join('\n') ||
              '';
            const role = msg.role === 'user' ? '> ' : '';
            return `${role}${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
          })
          .join('\n');
        return `Conversation [${num}]: ${conv.title || 'Untitled Conversation'}\n${'─'.repeat(60)}\n${preview}\n${messages.length > 10 ? `\n... (${messages.length - 10} more messages)` : ''}`;
      },
    },
    tree: {
      description: 'Display conversations in tree format',
      usage: 'tree',
      fn: () => {
        return formatConversationsTree();
      },
    },
    pwd: {
      description: 'Print current conversation',
      usage: 'pwd',
      fn: () => {
        return 'No conversation loaded. Use "load <number>" or "interlocutor" to start.';
      },
    },
    clear: {
      description: 'Clear terminal screen',
      usage: 'clear',
      fn: () => {
        return '';
      },
    },
    cls: {
      description: 'Clear terminal screen (DOS)',
      usage: 'cls',
      fn: () => {
        return '';
      },
    },
    gui: {
      description: 'Switch to default chat view',
      usage: 'gui',
      fn: () => {
        if (onExitToChat) {
          onExitToChat();
          return 'Switching to chat view...';
        }
        return 'Not available.';
      },
    },
    chat: {
      description: 'Switch to default chat view',
      usage: 'chat',
      fn: () => {
        if (onExitToChat) {
          onExitToChat();
          return 'Switching to chat view...';
        }
        return 'Not available.';
      },
    },
    '?': {
      description: 'Show help message',
      usage: '? [command]',
      fn: (...args: string[]) => {
        const cmd = args[0];
        const commands = createCommandModeCommands(context);
        if (cmd && commands[cmd]) {
          return `${cmd}: ${commands[cmd].description}\nUsage: ${commands[cmd].usage}`;
        }
        return `Available commands:
  ls, dir          List conversations
  load <n>, open <n>  Load conversation by number
  cat <n>, type <n>   Preview conversation contents
  tree              Show conversations as tree
  pwd               Show current conversation
  clear, cls        Clear terminal
  gui, chat        Switch to default chat view (Ctrl+Shift+E)
  ?                 Show this help
  interlocutor      Start or select a conversation
  rm <n>, del <n>   Delete conversation

Type '? <command>' for more info on a command.`;
      },
    },
    rm: {
      description: 'Delete a conversation (Unix)',
      usage: 'rm <number>',
      fn: (...args: string[]) => {
        const numStr = args[0];
        if (!numStr) {
          return 'Usage: rm <number>\nExample: rm 1';
        }
        const num = parseInt(numStr, 10);
        if (isNaN(num) || num < 1) {
          return `Invalid conversation number: ${numStr}`;
        }
        // Get conversation directly from sortedConversations to ensure we have the latest data
        const index = num - 1;
        if (index < 0 || index >= sortedConversations.length) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        const conv = sortedConversations[index];
        if (!conv) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        deleteConversation(conv.id);
        return `Deleted conversation [${num}]: ${conv.title || 'Untitled Conversation'}`;
      },
    },
    del: {
      description: 'Delete a conversation (DOS)',
      usage: 'del <number>',
      fn: (...args: string[]) => {
        const numStr = args[0];
        if (!numStr) {
          return 'Usage: del <number>\nExample: del 1';
        }
        const num = parseInt(numStr, 10);
        if (isNaN(num) || num < 1) {
          return `Invalid conversation number: ${numStr}`;
        }
        // Get conversation directly from sortedConversations to ensure we have the latest data
        const index = num - 1;
        if (index < 0 || index >= sortedConversations.length) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        const conv = sortedConversations[index];
        if (!conv) {
          return `Conversation [${num}] not found. Use 'ls' to list conversations.`;
        }
        deleteConversation(conv.id);
        return `Deleted conversation [${num}]: ${conv.title || 'Untitled Conversation'}`;
      },
    },
  };
};
