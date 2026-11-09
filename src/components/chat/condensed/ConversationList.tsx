/**
 * ConversationList.tsx — Scrollable, virtualised list of stored conversations.
 *
 * @module components/chat/condensed/ConversationList
 */

import { TerminalImportProgress } from '@/components/animations/TerminalImportProgress';
import {
  useConversationStore,
  type ConversationMessage,
} from '@/lib/conversation-store';
import { useSettingsStore } from '@/lib/settings-store';
import { Box, Button, Text, VStack } from '@chakra-ui/react';
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { HiPlus } from 'react-icons/hi';
import { ConversationItem } from './ConversationItem';
import { ConversationListToolbar } from './ConversationListToolbar';
import { DuplicateImportDialog } from './DuplicateImportDialog';
import { extractMessageText, formatDate } from './conversationListUtils';
import { useConversationImport } from './useConversationImport';

interface ConversationListProps {
  readonly onConversationSelect?: () => void;
}

export interface ConversationListRef {
  readonly triggerImport: () => void;
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
  const loadConversationMessages = useConversationStore(
    (state) => state.loadConversationMessages
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    importProgress,
    duplicateCount,
    duplicateDialogOpen,
    handleFileImport,
    handleConfirmOverwrite,
    handleCancelOverwrite,
  } = useConversationImport(fileInputRef);

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
          const messageText = extractMessageText(
            message as ConversationMessage
          );
          if (messageText.includes(lowerTerm)) {
            return true;
          }
        }
      }

      return false;
    },
    [loadConversationMessages]
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

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Expose import trigger via ref
  useImperativeHandle(ref, () => ({
    triggerImport: handleImportClick,
  }));

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
        <ConversationListToolbar
          headerBackgroundColor={headerBackgroundColor}
          fileInputRef={fileInputRef}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          sortOrder={sortOrder}
          onSortOrderToggle={() =>
            setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
          }
          onCreateConversation={createConversation}
          onFileImport={handleFileImport}
        />

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
        <DuplicateImportDialog
          open={duplicateDialogOpen}
          duplicateCount={duplicateCount}
          onCancel={handleCancelOverwrite}
          onConfirm={handleConfirmOverwrite}
        />
      </Box>
    </>
  );
});

ConversationList.displayName = 'ConversationList';
