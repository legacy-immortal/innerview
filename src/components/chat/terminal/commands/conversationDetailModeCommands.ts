/**
 * @file conversationDetailModeCommands.ts — Terminal conversation-detail mode command handlers.
 * @module components/chat/terminal/commands/conversationDetailModeCommands
 *
 * Terminal conversation-detail mode command handlers. Defines `ConversationDetailModeContext`
 * and builds the detail command table (`start`, `enter`, `begin`, `back`, `ls`, `cat`, `help`,
 * `?`, etc.). Consumed by `useTerminalCommands`.
 */

import type {
  CommandDefinition,
  ConversationWithOptionalCreatedAt,
} from './commandModeCommands';
import type { ConversationMessage } from '@/lib/conversation-store';

export interface ConversationDetailModeContext {
  readonly currentConversation: ConversationWithOptionalCreatedAt | null;
  readonly conversationMessages: readonly ConversationMessage[];
  readonly onConversationLoad: (id: string) => void;
  readonly setMode: (
    mode:
      | 'filesystem'
      | 'conversation-selection'
      | 'conversation-preview'
      | 'conversation-active'
  ) => void;
  readonly setDisplayedMessageIds: (ids: Set<string>) => void;
  readonly clearStdout: () => void;
  readonly onExitToChat?: () => void;
}

/**
 * Builds the conversation-detail mode command table.
 *
 * @param context Mode context (current conversation + navigation setters).
 * @returns Map from command name to its definition.
 */
export const createConversationDetailModeCommands = (
  context: ConversationDetailModeContext
): Record<string, CommandDefinition> => {
  const {
    currentConversation,
    conversationMessages,
    onConversationLoad,
    setMode,
    setDisplayedMessageIds,
    clearStdout,
    onExitToChat,
  } = context;

  return {
    start: {
      description: 'Start chatting in this conversation',
      usage: 'start',
      fn: () => {
        if (!currentConversation) {
          return 'No conversation loaded. Use "back" to return to filesystem mode.';
        }
        // Reload the conversation to ensure we have the latest messages
        onConversationLoad(currentConversation.id);
        setMode('conversation-active');
        setDisplayedMessageIds(new Set());
        clearStdout();
        return `Started conversation: ${currentConversation.title || 'Untitled Conversation'}\nType your message and press Enter to send.`;
      },
    },
    enter: {
      description: 'Enter this conversation',
      usage: 'enter',
      fn: () => {
        if (!currentConversation) {
          return 'No conversation loaded. Use "back" to return to filesystem mode.';
        }
        onConversationLoad(currentConversation.id);
        setMode('conversation-active');
        setDisplayedMessageIds(new Set());
        clearStdout();
        return `Entered conversation: ${currentConversation.title || 'Untitled Conversation'}\nType your message and press Enter to send.`;
      },
    },
    begin: {
      description: 'Begin chatting in this conversation',
      usage: 'begin',
      fn: () => {
        if (!currentConversation) {
          return 'No conversation loaded. Use "back" to return to filesystem mode.';
        }
        onConversationLoad(currentConversation.id);
        setMode('conversation-active');
        setDisplayedMessageIds(new Set());
        clearStdout();
        return `Started conversation: ${currentConversation.title || 'Untitled Conversation'}\nType your message and press Enter to send.`;
      },
    },
    back: {
      description: 'Return to filesystem mode',
      usage: 'back',
      fn: () => {
        setMode('filesystem');
        clearStdout();
        return 'Returned to filesystem mode.';
      },
    },
    'cd ..': {
      description: 'Return to command mode (Unix)',
      usage: 'cd ..',
      fn: () => {
        setMode('filesystem');
        clearStdout();
        return 'Returned to filesystem mode.';
      },
    },
    exit: {
      description: 'Exit conversation detail view',
      usage: 'exit',
      fn: () => {
        setMode('filesystem');
        clearStdout();
        return 'Returned to filesystem mode.';
      },
    },
    quit: {
      description: 'Quit conversation detail view',
      usage: 'quit',
      fn: () => {
        setMode('filesystem');
        clearStdout();
        return 'Returned to filesystem mode.';
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
    pwd: {
      description: 'Show current conversation',
      usage: 'pwd',
      fn: () => {
        if (!currentConversation) {
          return 'No conversation loaded.';
        }
        return `Current conversation: [${currentConversation.id}] ${currentConversation.title || 'Untitled Conversation'}`;
      },
    },
    ls: {
      description: 'List conversation messages',
      usage: 'ls',
      fn: () => {
        if (!currentConversation) {
          return 'No conversation loaded.';
        }
        if (conversationMessages.length === 0) {
          return `Conversation: ${currentConversation.title || 'Untitled Conversation'}\n(No messages yet)\n\nUse 'start', 'enter', or 'begin' to start chatting.`;
        }
        const preview = conversationMessages
          .slice(0, 20)
          .map((msg, idx) => {
            const content =
              msg.content ||
              msg.parts
                ?.filter((p) => p?.type === 'text')
                .map((p) => p?.text || '')
                .join('\n') ||
              '';
            const role = msg.role === 'user' ? '> ' : '  ';
            const num = (idx + 1).toString().padStart(3, ' ');
            return `${num} ${role}${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`;
          })
          .join('\n');
        return `Conversation: ${currentConversation.title || 'Untitled Conversation'}\n${'─'.repeat(60)}\n${preview}${conversationMessages.length > 20 ? `\n... (${conversationMessages.length - 20} more messages)` : ''}\n\nUse 'start', 'enter', or 'begin' to start chatting.`;
      },
    },
    cat: {
      description: 'Display conversation contents',
      usage: 'cat',
      fn: () => {
        if (!currentConversation) {
          return 'No conversation loaded.';
        }
        if (conversationMessages.length === 0) {
          return `Conversation: ${currentConversation.title || 'Untitled Conversation'}\n(No messages yet)\n\nUse 'start', 'enter', or 'begin' to start chatting.`;
        }
        const preview = conversationMessages
          .slice(0, 20)
          .map((msg) => {
            const content =
              msg.content ||
              msg.parts
                ?.filter((p) => p?.type === 'text')
                .map((p) => p?.text || '')
                .join('\n') ||
              '';
            const role = msg.role === 'user' ? '> ' : '  ';
            return `${role}${content}`;
          })
          .join('\n\n');
        return `Conversation: ${currentConversation.title || 'Untitled Conversation'}\n${'─'.repeat(60)}\n${preview}${conversationMessages.length > 20 ? `\n\n... (${conversationMessages.length - 20} more messages)` : ''}\n\nUse 'start', 'enter', or 'begin' to start chatting.`;
      },
    },
    help: {
      description: 'Show available commands',
      usage: 'help',
      fn: () => {
        return `Available commands:
  start, enter, begin  - Start chatting in this conversation
  back, exit, quit    - Return to filesystem mode
  cd ..               - Return to filesystem mode (Unix)
  gui, chat           - Switch to default chat view (Ctrl+Shift+E)
  pwd                 - Show current conversation
  ls                  - List conversation messages
  cat                 - Display full conversation contents
  help, ?             - Show this help message

Type 'start', 'enter', or 'begin' to start chatting in this conversation.`;
      },
    },
    '?': {
      description: 'Show available commands',
      usage: '?',
      fn: () => {
        return `Available commands:
  start, enter, begin  - Start chatting in this conversation
  back, exit, quit    - Return to filesystem mode
  cd ..               - Return to filesystem mode (Unix)
  gui, chat           - Switch to default chat view (Ctrl+Shift+E)
  pwd                 - Show current conversation
  ls                  - List conversation messages
  cat                 - Display full conversation contents
  help, ?             - Show this help message

Type 'start', 'enter', or 'begin' to start chatting in this conversation.`;
      },
    },
  };
};
