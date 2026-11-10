/**
 * @file CorpoLayout.tsx — Frame for the corpo layout (drawer, header, content slot).
 *
 * @module components/chat/corpo/CorpoLayout
 */

import { ChatInput } from '@/components/chat/condensed/ChatInput';
import {
  ConversationList,
  type ConversationListRef,
} from '@/components/chat/condensed/ConversationList';
import { MessagesContainer } from '@/components/chat/condensed/MessagesContainer';
import { ChatDebugMenu } from '@/components/chat/shared/ChatDebugMenu';
import { ErrorAlert } from '@/components/chat/shared/ErrorAlert';
import type { useConversationStore } from '@/lib/conversation-store';
import pkg from '../../../../package.json';
import {
  Box,
  Drawer,
  HStack,
  IconButton,
  Menu,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react';
import { memo, useCallback, type JSX } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { UIMessage } from 'ai';
import { HiChevronRight } from 'react-icons/hi';
import { LuSettings, LuX } from 'react-icons/lu';

export interface CorpoLayoutProps {
  readonly drawerOpen: boolean;
  readonly onDrawerOpenChange: (open: boolean) => void;
  readonly messages: UIMessage[];
  readonly isLoading: boolean;
  readonly isLoadingMessages: boolean;
  readonly messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  readonly messagesParentRef: React.RefObject<HTMLDivElement | null>;
  readonly virtualizer: ReturnType<
    typeof useVirtualizer<HTMLDivElement, Element>
  >;
  readonly input: string;
  readonly onInputChange: (value: string) => void;
  readonly onSubmit: (text: string) => void;
  readonly promptInputBackgroundColor: string;
  readonly sidebarBackgroundColor: string;
  readonly usedTokens: number;
  readonly maxContextTokens: number;
  readonly tokenUsage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
  };
  readonly onTranscriptionComplete: (text: string) => void;
  readonly onTranscriptionStart?: () => void;
  readonly onTranscriptionStop?: () => void;
  readonly disableTranscription?: boolean;
  readonly isRecording?: boolean;
  readonly isTranscribing?: boolean;
  readonly audioLevel?: number;
  readonly transcriptionError?: Error | null;
  readonly conversationListRef: React.RefObject<ConversationListRef | null>;
  readonly onConversationSelect: () => void;
  readonly createConversation: () => void;
  readonly onShowPerformanceSettings: () => void;
  readonly onDeleteMessage?: (messageId: string) => void;
  readonly chatError: { message: string } | null;
  readonly onCloseError: () => void;
  readonly ttsEnabled: boolean;
  readonly onTtsToggle: () => void;
  readonly isTTSSpeaking: boolean;
  readonly onStopAudio: () => void;
  readonly effectiveConversationId: string;
  readonly conversations: ReturnType<
    typeof useConversationStore.getState
  >['conversations'];
  readonly loadConversationMessages: ReturnType<
    typeof useConversationStore.getState
  >['loadConversationMessages'];
  readonly purgeDuplicateMessages: ReturnType<
    typeof useConversationStore.getState
  >['purgeDuplicateMessages'];
  readonly clearAllConversations: ReturnType<
    typeof useConversationStore.getState
  >['clearAllConversations'];
}

function CorpoLayoutComponent({
  drawerOpen,
  onDrawerOpenChange,
  messages,
  isLoading,
  isLoadingMessages,
  messagesContainerRef,
  messagesParentRef,
  virtualizer,
  input,
  onInputChange,
  onSubmit,
  promptInputBackgroundColor,
  sidebarBackgroundColor,
  usedTokens,
  maxContextTokens,
  tokenUsage,
  onTranscriptionComplete,
  onTranscriptionStart,
  onTranscriptionStop,
  disableTranscription,
  isRecording,
  isTranscribing,
  audioLevel,
  transcriptionError,
  conversationListRef,
  onConversationSelect,
  createConversation,
  onShowPerformanceSettings,
  onDeleteMessage,
  chatError,
  onCloseError,
  ttsEnabled,
  onTtsToggle,
  isTTSSpeaking,
  onStopAudio,
  effectiveConversationId,
  conversations,
  loadConversationMessages,
  purgeDuplicateMessages,
  clearAllConversations,
}: CorpoLayoutProps): JSX.Element {
  const handleConversationSelectAndClose = useCallback(() => {
    onConversationSelect();
    onDrawerOpenChange(false);
  }, [onConversationSelect, onDrawerOpenChange]);

  const openSettingsAndClose = useCallback(() => {
    // Close the drawer first so it does not linger behind the settings modal.
    onDrawerOpenChange(false);
    // Defer opening the modal to the next frame to avoid the drawer's
    // open-change handler racing with the modal mount.
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        onShowPerformanceSettings();
      });
    } else {
      onShowPerformanceSettings();
    }
  }, [onShowPerformanceSettings, onDrawerOpenChange]);

  return (
    <Box
      position="relative"
      h="100dvh"
      w="100%"
      maxW="100%"
      display="flex"
      flexDirection="column"
      touchAction="none"
    >
      {/* Top-left: open drawer and settings menu */}
      <HStack
        position="fixed"
        top={3}
        left={3}
        zIndex={20}
        gap={1}
        align="center"
      >
        <IconButton
          aria-label="Open menu"
          size="sm"
          variant="ghost"
          colorPalette="gray"
          onClick={() => onDrawerOpenChange(true)}
        >
          <HiChevronRight />
        </IconButton>
        <Menu.Root
          positioning={{ placement: 'bottom-start', strategy: 'fixed' }}
          lazyMount
        >
          <Menu.Trigger asChild>
            <IconButton
              aria-label="Agent and settings"
              size="sm"
              variant="ghost"
              colorPalette="gray"
              opacity={0.85}
            >
              <LuSettings />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                bg="rgba(0,0,0,0.9)"
                minW={{ base: 'min(200px, 85vw)', md: '200px' }}
                maxW="calc(100vw - 2rem)"
                p={0}
                borderRadius="none"
                border="1px solid"
                borderColor="rgba(255, 255, 255, 0.08)"
              >
                <ChatDebugMenu
                  ttsEnabled={ttsEnabled}
                  onTtsToggle={onTtsToggle}
                  isTTSSpeaking={isTTSSpeaking}
                  onStop={onStopAudio}
                  onShowPerformanceSettings={openSettingsAndClose}
                  effectiveConversationId={effectiveConversationId}
                  conversations={conversations}
                  loadConversationMessages={loadConversationMessages}
                  purgeDuplicateMessages={purgeDuplicateMessages}
                  clearAllConversations={clearAllConversations}
                  createConversation={createConversation as () => string}
                  conversationListRef={conversationListRef}
                />
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>

      {/* Left drawer / collapsible sidebar */}
      <Drawer.Root
        open={drawerOpen}
        onOpenChange={(e) => onDrawerOpenChange(e.open)}
        placement="start"
        size="xs"
      >
        <Drawer.Backdrop bg="rgba(0, 0, 0, 0.4)" />
        <Portal>
          <Drawer.Positioner>
            <Drawer.Content
              bg="rgba(18, 18, 18, 0.96)"
              w={{ base: 'min(85vw, 300px)', md: '280px' }}
              maxW={{ base: 'min(85vw, 300px)', md: '280px' }}
              fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            >
              <Drawer.Header
                borderBottom="1px solid"
                borderColor="rgba(255, 255, 255, 0.08)"
              >
                <Drawer.Title color="gray.200" fontSize="sm">
                  Interlocutor v{pkg.version}
                </Drawer.Title>
                <Drawer.CloseTrigger asChild>
                  <IconButton
                    aria-label="Close menu"
                    size="sm"
                    variant="ghost"
                    colorPalette="gray"
                  >
                    <LuX />
                  </IconButton>
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body
                overflowY="auto"
                p={0}
                display="flex"
                flexDirection="column"
              >
                <VStack align="stretch" gap={0} flex={1} minH={0}>
                  <Box
                    flex={1}
                    minH={0}
                    overflow="hidden"
                    display="flex"
                    flexDirection="column"
                  >
                    <Text
                      px={3}
                      py={2}
                      fontSize="xs"
                      color="gray.500"
                      fontWeight={600}
                    >
                      CONVERSATIONS
                    </Text>
                    <Box flex={1} overflow="auto" minH={0}>
                      <ConversationList
                        ref={conversationListRef}
                        onConversationSelect={handleConversationSelectAndClose}
                      />
                    </Box>
                  </Box>
                </VStack>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      {/* Main: messages area above fixed input */}
      <Box
        position="relative"
        flex={1}
        minH={0}
        w="100%"
        pt={16}
        display="flex"
        flexDirection="column"
      >
        <Box
          w={{ base: '100%', md: '85vw', lg: '75vw' }}
          maxW="100%"
          mx="auto"
          display="flex"
          flexDirection="column"
          flex={1}
          minH={0}
        >
          {chatError && (
            <Box flexShrink={0} px={4} pb={2}>
              <ErrorAlert error={chatError} onClose={onCloseError} />
            </Box>
          )}
          <Box flex={1} minH={0} position="relative">
            <MessagesContainer
              messages={messages}
              isLoading={isLoading}
              isLoadingMessages={isLoadingMessages}
              messagesContainerRef={messagesContainerRef}
              messagesParentRef={messagesParentRef}
              virtualizer={virtualizer}
              onDeleteMessage={onDeleteMessage}
            />
          </Box>
        </Box>
      </Box>

      {/* Fixed bottom: borderless transparent input */}
      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        zIndex={15}
        w={{ base: '100%', md: '85vw', lg: '75vw' }}
        maxW="100%"
        mx="auto"
      >
        <ChatInput
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          promptInputBackgroundColor={promptInputBackgroundColor}
          sidebarBackgroundColor={sidebarBackgroundColor}
          usedTokens={usedTokens}
          maxContextTokens={maxContextTokens}
          tokenUsage={tokenUsage}
          onTranscriptionComplete={onTranscriptionComplete}
          onTranscriptionStart={onTranscriptionStart}
          onTranscriptionStop={onTranscriptionStop}
          disableTranscription={disableTranscription}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          audioLevel={audioLevel}
          transcriptionError={transcriptionError}
        />
      </Box>
    </Box>
  );
}

/** Memoized corpo layout chrome (drawer, header, message area, input). */
export const CorpoLayout = memo(CorpoLayoutComponent);
