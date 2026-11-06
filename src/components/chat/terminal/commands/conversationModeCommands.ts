import type {
  CommandDefinition,
  ConversationWithOptionalCreatedAt,
} from './commandModeCommands';

export type ConversationModeContext = {
  sortedConversations: ConversationWithOptionalCreatedAt[];
  formatConversationsList: () => string;
  getCurrentConversationId: () => string | null;
  setMode: (
    mode: 'filesystem' | 'conversation-selection' | 'conversation-active'
  ) => void;
  setDisplayedMessageIds: (ids: Set<string>) => void;
  clearStdout: () => void;
  onExitToChat?: () => void;
};

export const createConversationModeCommands = (
  context: ConversationModeContext
): Record<string, CommandDefinition> => {
  const {
    sortedConversations,
    formatConversationsList,
    getCurrentConversationId,
    setMode,
    setDisplayedMessageIds,
    clearStdout,
    onExitToChat,
  } = context;

  return {
    ls: {
      description: 'List directory contents',
      usage: 'ls',
      fn: () => {
        return formatConversationsList();
      },
    },
    dir: {
      description: 'List directory contents (DOS)',
      usage: 'dir',
      fn: () => {
        return formatConversationsList();
      },
    },
    interlocutor: {
      description: 'Return to conversation selection',
      usage: 'interlocutor',
      fn: () => {
        if (sortedConversations.length === 0) {
          return 'No conversations available. Type a message to start chatting.';
        }
        setMode('conversation-selection');
        const list = sortedConversations
          .map(
            (conv, idx) =>
              `${idx === 0 ? '→' : ' '} ${idx + 1}. ${conv.title || 'Untitled Conversation'}`
          )
          .join('\n');
        return `Select a conversation:\n${list}\n\nUse ↑↓ to navigate, Enter to select, Esc to cancel`;
      },
    },
    exit: {
      description: 'Exit conversation and return to command mode',
      usage: 'exit',
      fn: () => {
        setMode('filesystem');
        setDisplayedMessageIds(new Set());
        clearStdout();
        return 'Returned to filesystem mode.';
      },
    },
    quit: {
      description: 'Exit conversation and return to command mode',
      usage: 'quit',
      fn: () => {
        setMode('filesystem');
        setDisplayedMessageIds(new Set());
        clearStdout();
        return 'Returned to filesystem mode.';
      },
    },
    back: {
      description: 'Go back to conversation selection',
      usage: 'back',
      fn: () => {
        if (sortedConversations.length === 0) {
          return 'No conversations available.';
        }
        const list = sortedConversations
          .map(
            (conv, idx) =>
              `[${idx + 1}] ${conv.title || 'Untitled Conversation'}`
          )
          .join('\n');
        return `Available conversations:\n${list}\n\nUse 'load <number>' or 'open <number>' to load a conversation.`;
      },
    },
    'cd ..': {
      description: 'Go back to command mode (Unix style)',
      usage: 'cd ..',
      fn: () => {
        setMode('filesystem');
        setDisplayedMessageIds(new Set());
        clearStdout();
        return 'Returned to filesystem mode.';
      },
    },
    pwd: {
      description: 'Print current conversation',
      usage: 'pwd',
      fn: () => {
        const currentId = getCurrentConversationId();
        if (!currentId) {
          return 'No conversation loaded.';
        }
        const conv = sortedConversations.find((c) => c.id === currentId);
        if (!conv) {
          return 'Current conversation not found in list.';
        }
        const index = sortedConversations.findIndex((c) => c.id === currentId);
        return `[${index + 1}] ${conv.title || 'Untitled Conversation'}`;
      },
    },
    clear: {
      description: 'Clear terminal screen',
      usage: 'clear',
      fn: () => {
        clearStdout();
        return '';
      },
    },
    cls: {
      description: 'Clear terminal screen (DOS)',
      usage: 'cls',
      fn: () => {
        clearStdout();
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
        const commands = createConversationModeCommands(context);
        if (cmd && commands[cmd]) {
          return `${cmd}: ${commands[cmd].description}\nUsage: ${commands[cmd].usage}`;
        }
        return `Available commands:
  ls, dir          List conversations
  interlocutor     Select a different conversation
  pwd              Show current conversation
  clear, cls       Clear terminal
  gui, chat        Switch to default chat view (Ctrl+Shift+E)
  exit, quit       Return to command mode
  back, cd ..      Go back to command mode
  ?                Show this help

Type a message to chat, or use commands above to navigate.`;
      },
    },
  };
};
