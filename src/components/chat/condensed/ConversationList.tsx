import { TerminalImportProgress } from '@/components/animations/TerminalImportProgress';
import { toaster } from '@/components/ui/toaster';
import {
  importConversation,
  parseImportFile,
} from '@/lib/conversation-importer';
import {
  useConversationStore,
  type ConversationMessage,
} from '@/lib/conversation-store';
import { useSettingsStore } from '@/lib/settings-store';
import {
  Box,
  Button,
  Dialog,
  HStack,
  IconButton,
  Input,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { UIMessage } from 'ai';
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { HiArrowDown, HiArrowUp, HiPlus, HiSearch } from 'react-icons/hi';

interface ConversationListProps {
  onConversationSelect?: () => void;
}

export interface ConversationListRef {
  triggerImport: () => void;
}

export const ConversationList = React.forwardRef<
  ConversationListRef,
  ConversationListProps
>(({ onConversationSelect }, ref) => {
  const conversations = useConversationStore((state) => state.conversations);
  const currentConversationId = useConversationStore(
    (state) => state.currentConversationId
  );
  const createConversation = useConversationStore(
    (state) => state.createConversation
  );
  const setCurrentConversation = useConversationStore(
    (state) => state.setCurrentConversation
  );
  const importConversationToStore = useConversationStore(
    (state) => state.importConversation
  );
  const importConversationsToStore = useConversationStore(
    (state) => state.importConversations
  );
  const loadConversationMessages = useConversationStore(
    (state) => state.loadConversationMessages
  );
  const saveConversationMessages = useConversationStore(
    (state) => state.saveConversationMessages
  );

  // Get style settings
  const headerBackgroundColor = useSettingsStore(
    (state) =>
      state.settings?.style?.sidebarHeaderBackgroundColor || 'transparent'
  );
  const itemBackgroundColor = useSettingsStore(
    (state) =>
      state.settings?.style?.sidebarConversationItemBackgroundColor ||
      'transparent'
  );
  const itemHoverBackgroundColor = useSettingsStore(
    (state) =>
      state.settings?.style?.sidebarConversationItemHoverBackgroundColor ||
      'rgba(255, 255, 255, 0.02)'
  );
  const itemActiveBackgroundColor = useSettingsStore(
    (state) =>
      state.settings?.style?.sidebarConversationItemActiveBackgroundColor ||
      'rgba(255, 255, 255, 0.05)'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const importCancelledRef = useRef(false);
  type ImportData = ReturnType<typeof importConversation> & {
    duplicateMap?: Map<string, { conversationId: string; message: UIMessage }>;
  };
  const [pendingImport, setPendingImport] = useState<{
    type: 'single' | 'multiple';
    single?: ImportData;
    multiple?: ImportData[];
    duplicateMap?: Map<string, { conversationId: string; message: UIMessage }>;
  } | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Import progress state
  const [importProgress, setImportProgress] = useState<{
    isImporting: boolean;
    currentStep: string;
    progress: number;
    totalSteps: number;
  }>({
    isImporting: false,
    currentStep: '',
    progress: 0,
    totalSteps: 100, // More granular steps
  });

  // Helper function to extract text from message content and parts
  const extractMessageText = useCallback(
    (message: ConversationMessage): string => {
      let text = message.content || '';
      if (message.parts) {
        const textParts = message.parts
          .filter((p) => p.type === 'text' && p.text)
          .map((p) => p.text)
          .join(' ');
        if (textParts) {
          text += ' ' + textParts;
        }
      }
      return text.toLowerCase();
    },
    []
  );

  // Helper function to check if a conversation matches the search term
  const conversationMatches = useCallback(
    (conversation: (typeof conversations)[0], term: string): boolean => {
      if (!term.trim()) return true;

      const lowerTerm = term.toLowerCase();

      // Check title
      if (conversation.title.toLowerCase().includes(lowerTerm)) {
        return true;
      }

      // Check message contents
      const messages = loadConversationMessages(conversation.id);
      if (messages) {
        for (const message of messages) {
          const messageText = extractMessageText(message);
          if (messageText.includes(lowerTerm)) {
            return true;
          }
        }
      }

      return false;
    },
    [loadConversationMessages, extractMessageText]
  );

  // Memoize filtered and sorted conversations
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = conversations.filter((conv) =>
        conversationMatches(conv, searchTerm)
      );
    }

    // Sort by updatedAt
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [conversations, searchTerm, conversationMatches, sortOrder]);

  // Memoize the conversation select handler to prevent recreation on every render
  const handleConversationSelect = useCallback(
    (id: string) => {
      setCurrentConversation(id);
      onConversationSelect?.();
    },
    [setCurrentConversation, onConversationSelect]
  );

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  // Memoized conversation item component to prevent unnecessary re-renders
  interface ConversationItemProps {
    conversation: {
      id: string;
      title: string;
      preview?: string;
      updatedAt: string;
      messageCount: number;
    };
    isActive: boolean;
    onSelect: (id: string) => void;
    formatDate: (dateString: string) => string;
    itemBackgroundColor: string;
    itemHoverBackgroundColor: string;
    itemActiveBackgroundColor: string;
  }

  const ConversationItem = React.memo<ConversationItemProps>(
    ({
      conversation,
      isActive,
      onSelect,
      formatDate,
      itemBackgroundColor,
      itemHoverBackgroundColor,
      itemActiveBackgroundColor,
    }) => {
      const handleClick = useCallback(() => {
        onSelect(conversation.id);
      }, [conversation.id, onSelect]);

      // Memoize CSS styles to prevent recreation
      const boxStyles = useMemo(
        () => ({
          textShadow: isActive
            ? '0 0 4px rgba(16, 185, 129, 0.3)'
            : '0 0 2px rgba(255, 255, 255, 0.05)',
        }),
        [isActive]
      );

      const titleStyles = useMemo(
        () => ({
          textShadow: isActive
            ? '0 0 6px rgba(16, 185, 129, 0.4)'
            : '0 0 2px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
        [isActive]
      );

      const previewStyles = useMemo(
        () => ({
          textShadow: '0 0 2px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
        []
      );

      return (
        <Box
          p={3}
          cursor="pointer"
          bg={isActive ? itemActiveBackgroundColor : itemBackgroundColor}
          borderLeft={isActive ? '2px solid' : '2px solid transparent'}
          borderColor={isActive ? 'emerald.400' : 'transparent'}
          _hover={{
            bg: isActive ? itemActiveBackgroundColor : itemHoverBackgroundColor,
          }}
          onClick={handleClick}
          position="relative"
          css={boxStyles}
        >
          <HStack justify="space-between" align="flex-start" mb={1}>
            <Text
              fontSize="xs"
              fontWeight={isActive ? 600 : 400}
              color={isActive ? 'emerald.300' : 'gray.300'}
              flex={1}
              css={titleStyles}
            >
              {conversation.title}
            </Text>
          </HStack>

          {conversation.preview && (
            <Text fontSize="xs" color="gray.500" mb={1} css={previewStyles}>
              {conversation.preview}
            </Text>
          )}

          <HStack gap={2} fontSize="xs" color="gray.600">
            <Text>{formatDate(conversation.updatedAt)}</Text>
            <Text>•</Text>
            <Text>{conversation.messageCount} messages</Text>
          </HStack>
        </Box>
      );
    },
    (prevProps, nextProps) => {
      // Custom comparison: only re-render if conversation data, active state, or style colors change
      return (
        prevProps.conversation.id === nextProps.conversation.id &&
        prevProps.conversation.title === nextProps.conversation.title &&
        prevProps.conversation.preview === nextProps.conversation.preview &&
        prevProps.conversation.updatedAt === nextProps.conversation.updatedAt &&
        prevProps.conversation.messageCount ===
          nextProps.conversation.messageCount &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.onSelect === nextProps.onSelect &&
        prevProps.formatDate === nextProps.formatDate &&
        prevProps.itemBackgroundColor === nextProps.itemBackgroundColor &&
        prevProps.itemHoverBackgroundColor ===
          nextProps.itemHoverBackgroundColor &&
        prevProps.itemActiveBackgroundColor ===
          nextProps.itemActiveBackgroundColor
      );
    }
  );

  ConversationItem.displayName = 'ConversationItem';

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Expose import trigger via ref
  useImperativeHandle(ref, () => ({
    triggerImport: handleImportClick,
  }));

  // Helper to find all message IDs across all conversations
  const getAllMessageIds = (): Set<string> => {
    const allIds = new Set<string>();
    conversations.forEach((conv) => {
      const messages = loadConversationMessages(conv.id);
      messages?.forEach((msg) => {
        if (msg.id) {
          allIds.add(msg.id);
        }
      });
    });
    return allIds;
  };

  // Check for duplicate message IDs and find which conversations contain them
  const checkForDuplicates = (
    incomingMessages: UIMessage[]
  ): {
    hasDuplicates: boolean;
    count: number;
    duplicateMap: Map<string, { conversationId: string; message: UIMessage }>;
  } => {
    const existingIds = getAllMessageIds();
    const duplicateMap = new Map<
      string,
      { conversationId: string; message: UIMessage }
    >();

    // Find which conversations contain each duplicate message ID
    incomingMessages.forEach((incomingMsg) => {
      if (existingIds.has(incomingMsg.id)) {
        // Find which conversation contains this message ID
        for (const conv of conversations) {
          const messages = loadConversationMessages(conv.id);
          const existingMsg = messages?.find((m) => m.id === incomingMsg.id);
          if (existingMsg) {
            duplicateMap.set(incomingMsg.id, {
              conversationId: conv.id,
              message: incomingMsg,
            });
            break;
          }
        }
      }
    });

    return {
      hasDuplicates: duplicateMap.size > 0,
      count: duplicateMap.size,
      duplicateMap,
    };
  };

  // Helper to yield control to the browser to prevent blocking
  const yieldToBrowser = (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset cancellation flag
    importCancelledRef.current = false;

    // Start import progress
    setImportProgress({
      isImporting: true,
      currentStep: 'Parsing file...',
      progress: 0,
      totalSteps: 100,
    });

    // Yield to browser to allow UI to update
    await yieldToBrowser();

    try {
      setImportProgress((prev) => ({
        ...prev,
        currentStep: 'Reading file contents...',
        progress: 5,
      }));
      await yieldToBrowser();

      const parsed = await parseImportFile(file);

      setImportProgress((prev) => ({
        ...prev,
        currentStep: 'File parsed successfully',
        progress: 10,
      }));

      if (importCancelledRef.current) {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
        return;
      }

      // Yield to browser to allow UI to update
      await yieldToBrowser();

      if (parsed.type === 'single') {
        // Create progress callback for granular updates
        const progressCallback = (
          step: string,
          current: number,
          total: number
        ) => {
          if (importCancelledRef.current) return;
          // Map progress to 10-80% range (parsing is 0-10%, processing is 10-80%)
          const progressPercent = 10 + Math.floor((current / total) * 70);
          setImportProgress((prev) => ({
            ...prev,
            currentStep: step,
            progress: progressPercent,
          }));
        };

        const { conversation, messages, conversationMessages } =
          importConversation(parsed.data, progressCallback);

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        setImportProgress((prev) => ({
          ...prev,
          currentStep: 'Checking for duplicates...',
          progress: 80,
        }));

        // Yield to browser to allow UI to update
        await yieldToBrowser();

        // Check for duplicate message IDs
        const { hasDuplicates, count, duplicateMap } =
          checkForDuplicates(messages);

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        if (hasDuplicates) {
          // Store pending import and show dialog
          setPendingImport({
            type: 'single',
            single: {
              conversation,
              messages,
              conversationMessages,
              duplicateMap,
            },
          });
          setDuplicateCount(count);
          setDuplicateDialogOpen(true);
          // Don't hide progress bar yet - wait for user decision
        } else {
          setImportProgress((prev) => ({
            ...prev,
            currentStep: 'Saving to storage...',
            progress: 4,
          }));

          // Yield to browser to allow UI to update
          await yieldToBrowser();

          if (importCancelledRef.current) {
            setImportProgress((prev) => ({ ...prev, isImporting: false }));
            return;
          }

          // No duplicates, proceed with import
          try {
            importConversationToStore(
              conversation,
              messages,
              conversationMessages
            );

            setImportProgress({
              isImporting: false,
              currentStep: 'Complete!',
              progress: 100,
              totalSteps: 100,
            });

            // Hide progress bar after a delay
            setTimeout(() => {
              setImportProgress((prev) => ({ ...prev, isImporting: false }));
            }, 1500);

            toaster.create({
              title: 'Conversation imported',
              description: `"${conversation.title}" has been imported successfully.`,
              type: 'success',
              duration: 3000,
              meta: { closable: true },
            });
          } catch (error) {
            console.error('Import storage error:', error);

            setImportProgress({
              isImporting: false,
              currentStep: 'Complete with warnings',
              progress: 4,
              totalSteps: 4,
            });

            setTimeout(() => {
              setImportProgress((prev) => ({ ...prev, isImporting: false }));
            }, 2000);

            toaster.create({
              title: 'Import partially failed',
              description:
                'Conversation was imported but storage limits may have been exceeded. Some data may have been truncated.',
              type: 'warning',
              duration: 5000,
              meta: { closable: true },
            });
          }
        }
      } else {
        // For multiple conversations, process each with progress
        const conversations = parsed.data;
        const totalConversations = conversations.length;

        const imported = conversations.map((conv, convIndex) => {
          const progressCallback = (
            step: string,
            current: number,
            total: number
          ) => {
            if (importCancelledRef.current) return;
            // Map progress: 10% base + (conversation progress * 70% / total conversations)
            const conversationProgress = (convIndex / totalConversations) * 70;
            const messageProgress =
              (current / total) * (70 / totalConversations);
            const progressPercent =
              10 + Math.floor(conversationProgress + messageProgress);
            setImportProgress((prev) => ({
              ...prev,
              currentStep: `Processing conversation ${convIndex + 1}/${totalConversations}: ${step}`,
              progress: progressPercent,
            }));
          };

          return importConversation(conv, progressCallback);
        });

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        setImportProgress((prev) => ({
          ...prev,
          currentStep: 'Checking for duplicates...',
          progress: 80,
        }));

        // Yield to browser to allow UI to update
        await yieldToBrowser();

        // Check for duplicates across all imported conversations
        const allIncomingMessages = imported.flatMap((imp) => imp.messages);
        const { hasDuplicates, count, duplicateMap } =
          checkForDuplicates(allIncomingMessages);

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        if (hasDuplicates) {
          // Store pending import and show dialog
          setPendingImport({
            type: 'multiple',
            multiple: imported,
            duplicateMap,
          });
          setDuplicateCount(count);
          setDuplicateDialogOpen(true);
          // Don't hide progress bar yet - wait for user decision
        } else {
          setImportProgress((prev) => ({
            ...prev,
            currentStep: 'Saving to storage...',
            progress: 4,
          }));

          // Yield to browser to allow UI to update
          await yieldToBrowser();

          if (importCancelledRef.current) {
            setImportProgress((prev) => ({ ...prev, isImporting: false }));
            return;
          }

          // No duplicates, proceed with import
          try {
            importConversationsToStore(imported);

            setImportProgress({
              isImporting: false,
              currentStep: 'Complete!',
              progress: 100,
              totalSteps: 100,
            });

            // Hide progress bar after a delay
            setTimeout(() => {
              setImportProgress((prev) => ({ ...prev, isImporting: false }));
            }, 1500);

            toaster.create({
              title: 'Conversations imported',
              description: `${imported.length} conversations have been imported successfully.`,
              type: 'success',
              duration: 3000,
              meta: { closable: true },
            });
          } catch (error) {
            console.error('Import storage error:', error);

            setImportProgress({
              isImporting: false,
              currentStep: 'Complete with warnings',
              progress: 4,
              totalSteps: 4,
            });

            setTimeout(() => {
              setImportProgress((prev) => ({ ...prev, isImporting: false }));
            }, 2000);

            toaster.create({
              title: 'Import partially failed',
              description:
                'Conversations were imported but storage limits may have been exceeded. Some data may have been truncated.',
              type: 'warning',
              duration: 5000,
              meta: { closable: true },
            });
          }
        }
      }
    } catch (error) {
      if (importCancelledRef.current) {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
        return;
      }

      console.error('Import error:', error);

      setImportProgress({
        isImporting: false,
        currentStep: 'Failed',
        progress: 0,
        totalSteps: 4,
      });

      setTimeout(() => {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
      }, 2000);

      toaster.create({
        title: 'Import failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to import conversations',
        type: 'error',
        duration: 5000,
        meta: { closable: true },
      });
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!pendingImport) return;

    // Reset cancellation flag
    importCancelledRef.current = false;

    setImportProgress((prev) => ({
      ...prev,
      currentStep: 'Saving to storage...',
      progress: 4,
    }));

    // Yield to browser to allow UI to update
    await yieldToBrowser();

    if (importCancelledRef.current) {
      setImportProgress((prev) => ({ ...prev, isImporting: false }));
      setDuplicateDialogOpen(false);
      setPendingImport(null);
      setDuplicateCount(0);
      return;
    }

    // First, overwrite existing messages with duplicate IDs in their conversations
    const duplicateMap =
      pendingImport.duplicateMap ||
      (pendingImport.type === 'single' && pendingImport.single?.duplicateMap
        ? pendingImport.single.duplicateMap
        : new Map());

    duplicateMap.forEach(({ conversationId, message: incomingMessage }) => {
      // Load existing messages for this conversation
      const existingMessages = loadConversationMessages(conversationId);
      if (existingMessages) {
        // Replace the message with the incoming one
        const updatedMessages = existingMessages.map((msg) => {
          if (msg.id === incomingMessage.id) {
            // Extract text content from incoming message parts
            const textParts = incomingMessage.parts?.filter(
              (p: { type?: string }) => p.type === 'text'
            ) as Array<{ text?: string }> | undefined;
            const content =
              textParts
                ?.map((p: { text?: string }) => p.text)
                .join(' ')
                .trim() || msg.content;

            return {
              ...msg,
              role: incomingMessage.role as 'user' | 'assistant' | 'system',
              content,
              parts: incomingMessage.parts as typeof msg.parts,
              updatedAt: new Date().toISOString(),
            };
          }
          return msg;
        });
        // Save updated messages back
        saveConversationMessages(conversationId, updatedMessages);
      }
    });

    if (importCancelledRef.current) {
      setImportProgress((prev) => ({ ...prev, isImporting: false }));
      setDuplicateDialogOpen(false);
      setPendingImport(null);
      setDuplicateCount(0);
      return;
    }

    // Then proceed with normal import
    if (pendingImport.type === 'multiple' && pendingImport.multiple) {
      // Multiple conversation import
      importConversationsToStore(pendingImport.multiple);
      toaster.create({
        title: 'Conversations imported',
        description: `${pendingImport.multiple.length} conversations have been imported successfully. ${duplicateCount} duplicate message(s) were overwritten.`,
        type: 'success',
        duration: 3000,
        meta: { closable: true },
      });
    } else if (pendingImport.type === 'single' && pendingImport.single) {
      // Single conversation import
      importConversationToStore(
        pendingImport.single.conversation,
        pendingImport.single.messages,
        pendingImport.single.conversationMessages
      );
      toaster.create({
        title: 'Conversation imported',
        description: `"${pendingImport.single.conversation.title}" has been imported successfully. ${duplicateCount} duplicate message(s) were overwritten.`,
        type: 'success',
        duration: 3000,
        meta: { closable: true },
      });
    }

    setImportProgress({
      isImporting: false,
      currentStep: 'Complete!',
      progress: 4,
      totalSteps: 4,
    });

    setTimeout(() => {
      setImportProgress((prev) => ({ ...prev, isImporting: false }));
    }, 1500);

    setDuplicateDialogOpen(false);
    setPendingImport(null);
    setDuplicateCount(0);
  };

  const handleCancelOverwrite = () => {
    // Cancel the import
    importCancelledRef.current = true;
    setImportProgress((prev) => ({ ...prev, isImporting: false }));
    setDuplicateDialogOpen(false);
    setPendingImport(null);
    setDuplicateCount(0);
  };

  return (
    <>
      <TerminalImportProgress
        currentStep={importProgress.currentStep}
        progress={importProgress.progress}
        totalSteps={importProgress.totalSteps}
        isVisible={importProgress.isImporting}
      />
      <Box
        w="100%"
        h="100%"
        minH={0}
        display="flex"
        flexDirection="column"
        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
        fontSize="sm"
      >
        {/* Header with actions */}
        <Box
          p={2}
          borderBottom="1px solid"
          borderColor="rgba(255, 255, 255, 0.08)"
          bg={headerBackgroundColor}
        >
          <VStack gap={2} align="stretch">
            <HStack gap={2} justify="space-between">
              <Button
                size="xs"
                variant="outline"
                colorPalette="gray"
                onClick={() => createConversation()}
                flex={1}
              >
                <HiPlus />
                New
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                display="none"
              />
            </HStack>
            <HStack
              gap={2}
              align="center"
              px={2}
              py={1}
              border="1px solid"
              borderColor="rgba(255, 255, 255, 0.1)"
              borderRadius="md"
              bg="rgba(255, 255, 255, 0.03)"
              _focusWithin={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box color="gray.400" fontSize="sm">
                <HiSearch />
              </Box>
              <Input
                placeholder="Search conversations..."
                size="md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                border="none"
                bg="transparent"
                _focus={{
                  boxShadow: 'none',
                  outline: 'none',
                }}
                flex={1}
              />
              <IconButton
                aria-label={
                  sortOrder === 'desc'
                    ? 'Sort ascending (oldest first)'
                    : 'Sort descending (newest first)'
                }
                size="sm"
                variant="ghost"
                colorPalette="gray"
                onClick={() =>
                  setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                }
                title={
                  sortOrder === 'desc'
                    ? 'Sort ascending (oldest first)'
                    : 'Sort descending (newest first)'
                }
              >
                {sortOrder === 'desc' ? <HiArrowDown /> : <HiArrowUp />}
              </IconButton>
            </HStack>
          </VStack>
        </Box>

        <Box
          flex={1}
          overflowY="auto"
          overflowX="hidden"
          p={3}
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.25)',
              },
            },
            '&::-webkit-scrollbar-corner': {
              background: 'transparent',
            },
            // Firefox scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
          }}
        >
          <VStack gap={0} align="stretch" w="100%">
            {filteredAndSortedConversations.length === 0 ? (
              <Box p={4} textAlign="center">
                <Text fontSize="xs" color="gray.500" mb={2}>
                  {searchTerm.trim()
                    ? 'No conversations match your search'
                    : 'No conversations yet'}
                </Text>
                {!searchTerm.trim() && (
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="gray"
                    onClick={() => createConversation()}
                  >
                    <HiPlus />
                    Start New
                  </Button>
                )}
              </Box>
            ) : (
              filteredAndSortedConversations.map((conversation) => {
                const isActive = conversation.id === currentConversationId;
                return (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={isActive}
                    onSelect={handleConversationSelect}
                    formatDate={formatDate}
                    itemBackgroundColor={itemBackgroundColor}
                    itemHoverBackgroundColor={itemHoverBackgroundColor}
                    itemActiveBackgroundColor={itemActiveBackgroundColor}
                  />
                );
              })
            )}
          </VStack>
        </Box>

        {/* Duplicate Message ID Warning Dialog */}
        <Dialog.Root
          open={duplicateDialogOpen}
          onOpenChange={(e) => {
            // Only cancel if dialog is being closed (not opened)
            if (!e.open && duplicateDialogOpen) {
              handleCancelOverwrite();
            }
          }}
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Duplicate Message IDs Detected</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <VStack gap={4} align="stretch">
                    <Text>
                      Found {duplicateCount} message(s) with IDs that already
                      exist in your conversations.
                    </Text>
                    <Text fontSize="sm" color="gray.400">
                      If you proceed, the existing messages with matching IDs
                      will be overwritten with the imported messages.
                    </Text>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline" onClick={handleCancelOverwrite}>
                      Cancel
                    </Button>
                  </Dialog.ActionTrigger>
                  <Button
                    colorPalette="orange"
                    onClick={handleConfirmOverwrite}
                  >
                    Overwrite & Import
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </Box>
    </>
  );
});

ConversationList.displayName = 'ConversationList';
