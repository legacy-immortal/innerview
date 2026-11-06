import { useConversationStore } from '@/lib/conversation-store';
import { markdownToTerminal } from '@/utils/markdown-to-terminal';
import { Box, Button } from '@chakra-ui/react';
import type { UIMessage } from 'ai';
import { isTextUIPart } from 'ai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Terminal from 'react-console-emulator';
import { createCommandModeCommands } from './commands/commandModeCommands';
import { createConversationDetailModeCommands } from './commands/conversationDetailModeCommands';
import { createConversationModeCommands } from './commands/conversationModeCommands';

// Module-level flag so welcome message is shown only once (survives Strict Mode double-mount)
let globalWelcomeShown = false;
let currentMode: TerminalMode | null = null;

// Generate system info text for terminal header
const generateSystemInfo = (): string => {
  const hostnames = [
    'innerview',
    'neural-node-01',
    'ai-core-01',
    'neural-net-host',
  ];
  const kernels = ['6.1.0-arch', '6.0.0-debian', '5.19.0-fedora'];

  const cpus = [
    'AMD Ryzen 9 7950X',
    'Intel Core i9-13900K',
    'AMD Threadripper 3990X',
  ];

  const randomHostname =
    hostnames[Math.floor(Math.random() * hostnames.length)];
  const randomKernel = kernels[Math.floor(Math.random() * kernels.length)];
  const randomCpu = cpus[Math.floor(Math.random() * cpus.length)];

  const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  const days = Math.floor(Math.random() * 7);
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  const uptime = `${days}d ${hours}h ${minutes}m`;

  const load1 = (Math.random() * 2).toFixed(2);
  const load2 = (Math.random() * 2).toFixed(2);
  const load3 = (Math.random() * 2).toFixed(2);
  const loadAverage = `${load1}, ${load2}, ${load3}`;

  const memory = `${Math.floor(Math.random() * 32 + 16)}GB`;
  const disk = `${Math.floor(Math.random() * 512 + 256)}GB SSD`;
  const users = Math.floor(Math.random() * 3 + 1);

  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return `Welcome to Ubuntu 22.04.3 LTS (GNU/Linux ${randomKernel})
Last login: ${currentTime} from ${ip}

System Information:
Hostname: ${randomHostname}
OS: Linux
Kernel: ${randomKernel}
Uptime: ${uptime}
CPU: ${randomCpu}
Memory: ${memory}
Disk: ${disk}
Users: ${users}
Load Average: ${loadAverage}
IP Address: ${ip}

[sudo] password for user: ************
Authentication successful. You now have root access.
user@${randomHostname}:~$ sudo su -
root@${randomHostname}:~#`;
};

interface TerminalChatProps {
  messages: UIMessage[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  onPromptSubmit: (prompt: string) => void;
  conversations: Array<{
    id: string;
    title: string;
    preview?: string;
    updatedAt: string;
    messageCount?: number;
    createdAt?: string;
  }>;
  onConversationLoad: (conversationId: string) => void;
  onCreateConversation: () => void;
  onExitToChat?: () => void;
}

/**
 * Terminal View Modes - Clearly Namespaced:
 *
 * 1. FILESYSTEM MODE ('filesystem') - Root file system view
 *    - Lists conversations as files in a directory
 *    - Commands: ls, dir, load <n>, open <n>, cat <n>, tree, pwd, rm <n>, help, ?
 *    - Prompt: root@innerview:~#
 *    - Transitions: load <n> → conversation-preview
 *
 * 2. CONVERSATION PREVIEW MODE ('conversation-preview') - Preview conversation before starting
 *    - Shows conversation metadata and message preview
 *    - Commands: start, enter, begin, back, exit, quit, cd .., pwd, ls, cat, help, ?
 *    - Prompt: root@innerview:conversation#
 *    - Transitions: start/enter/begin → conversation-active, back/exit/quit/cd .. → filesystem
 *    - Input behavior: ALL input is commands, NEVER prompts
 *
 * 3. CONVERSATION ACTIVE MODE ('conversation-active') - Active chat session
 *    - User can chat with AI
 *    - Commands: back, exit, quit, cd .., ls, pwd, help, ?
 *    - Prompt: >
 *    - Transitions: back/exit/quit/cd .. → filesystem
 *    - Input behavior: Unknown commands are treated as chat messages (prompts)
 */
type TerminalMode =
  | 'filesystem'
  | 'conversation-selection'
  | 'conversation-preview'
  | 'conversation-active';

export const TerminalChat = ({
  messages,
  isLoading,
  isLoadingMessages: _isLoadingMessages,
  onPromptSubmit,
  conversations,
  onConversationLoad,
  onCreateConversation,
  onExitToChat,
}: TerminalChatProps) => {
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
  const [displayedMessageIds, setDisplayedMessageIds] = useState<Set<string>>(
    new Set()
  );
  // Get conversation store functions
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

  // Track mode changes to reset welcome message flag when switching modes
  useEffect(() => {
    // If mode changed from filesystem to something else, reset the flag
    if (currentMode === 'filesystem' && mode !== 'filesystem') {
      globalWelcomeShown = false;
    }
    currentMode = mode;
  }, [mode]);

  // Push system info ourselves so it shows exactly once (library's welcomeMessage runs in
  // componentDidMount and fires twice under Strict Mode; we avoid it and push via ref)
  useEffect(() => {
    if (mode !== 'filesystem' || globalWelcomeShown) return;
    const rafId = requestAnimationFrame(() => {
      if (terminalRef.current && !globalWelcomeShown) {
        terminalRef.current.pushToStdout(systemInfo);
        globalWelcomeShown = true;
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [mode, systemInfo]);

  // Switch to conversation-active mode when messages appear
  useEffect(() => {
    if (messages.length > 0 && mode === 'filesystem') {
      setMode('conversation-active');
    }
  }, [messages.length, mode]);

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
  }, [messages, mode, displayedMessageIds]);

  // Display loading indicator
  useEffect(() => {
    if (!terminalRef.current || mode !== 'conversation-active' || !isLoading)
      return;
    terminalRef.current.pushToStdout('thinking...');
  }, [isLoading, mode]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversations]);

  // Helper function to format date for terminal display
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day} ${hours}:${minutes}`;
  }, []);

  // Helper function to format conversations as file tree
  const formatConversationsList = useCallback((): string => {
    if (sortedConversations.length === 0) {
      return 'No conversations found.';
    }

    return sortedConversations
      .map((conv, idx) => {
        const num = idx + 1;
        const title = conv.title || 'Untitled Conversation';
        const msgCount = conv.messageCount || 0;
        const updated = formatDate(conv.updatedAt);
        const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        return `[${num}] ${filename.padEnd(40)} ${msgCount.toString().padStart(3)} msgs  ${updated}`;
      })
      .join('\n');
  }, [sortedConversations, formatDate]);

  // Helper function to format conversations as tree
  const formatConversationsTree = useCallback((): string => {
    if (sortedConversations.length === 0) {
      return 'No conversations found.';
    }

    const lines = ['conversations/'];
    sortedConversations.forEach((conv, idx) => {
      const num = idx + 1;
      const title = conv.title || 'Untitled Conversation';
      const msgCount = conv.messageCount || 0;
      const updated = formatDate(conv.updatedAt);
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      const isLast = idx === sortedConversations.length - 1;
      const prefix = isLast ? '└──' : '├──';
      lines.push(
        `${prefix} [${num}] ${filename} (${msgCount} msgs, ${updated})`
      );
    });

    return lines.join('\n');
  }, [sortedConversations, formatDate]);

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
        formatConversationsList,
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
    });
  }, [
    mode,
    onExitToChat,
    sortedConversations,
    formatConversationsList,
    formatConversationsTree,
    loadConversationMessages,
    onConversationLoad,
    onCreateConversation,
    deleteConversation,
    getCurrentConversationId,
    currentDetailConversation,
    detailConversationMessages,
    setDetailConversationId,
  ]);

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

  // Reset displayed messages when switching modes
  useEffect(() => {
    setDisplayedMessageIds(new Set());
    // Clear detail conversation ID when leaving conversation-preview mode
    if (mode !== 'conversation-preview') {
      setDetailConversationId(null);
    }
  }, [mode]);

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
      h="100vh"
      w="100vw"
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
      {onExitToChat && (
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
      )}
      <style>
        {`
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
        `}
      </style>
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
          height: '100vh',
          maxHeight: '100vh',
          width: '100vw',
          maxWidth: '100vw',
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
