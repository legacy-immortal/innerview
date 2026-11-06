import { ChatInput } from '@/components/chat/condensed/ChatInput';
import {
  ConversationList,
  type ConversationListRef,
} from '@/components/chat/condensed/ConversationList';
import { MessagesContainer } from '@/components/chat/condensed/MessagesContainer';
import { ChatDebugMenu } from '@/components/chat/shared/ChatDebugMenu';
import { ErrorAlert } from '@/components/chat/shared/ErrorAlert';
import type { useConversationStore } from '@/lib/conversation-store';
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
import { useVirtualizer } from '@tanstack/react-virtual';
import type { UIMessage } from 'ai';
import { HiChevronRight } from 'react-icons/hi';
import { LuSettings, LuX } from 'react-icons/lu';

export interface CorpoLayoutProps {
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  messages: UIMessage[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesParentRef: React.RefObject<HTMLDivElement | null>;
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (text: string) => void;
  promptInputBackgroundColor: string;
  sidebarBackgroundColor: string;
  usedTokens: number;
  maxContextTokens: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  onTranscriptionComplete: (text: string) => void;
  onTranscriptionStart?: () => void;
  onTranscriptionStop?: () => void;
  disableTranscription?: boolean;
  isRecording?: boolean;
  isTranscribing?: boolean;
  audioLevel?: number;
  transcriptionError?: Error | null;
  conversationListRef: React.RefObject<ConversationListRef | null>;
  onConversationSelect: () => void;
  createConversation: () => void;
  onShowPerformanceSettings: () => void;
  onDeleteMessage?: (messageId: string) => void;
  chatError: { message: string } | null;
  onCloseError: () => void;
  ttsEnabled: boolean;
  onTtsToggle: () => void;
  isTTSSpeaking: boolean;
  onStopAudio: () => void;
  effectiveConversationId: string;
  conversations: ReturnType<
    typeof useConversationStore.getState
  >['conversations'];
  loadConversationMessages: ReturnType<
    typeof useConversationStore.getState
  >['loadConversationMessages'];
  purgeDuplicateMessages: ReturnType<
    typeof useConversationStore.getState
  >['purgeDuplicateMessages'];
  clearAllConversations: ReturnType<
    typeof useConversationStore.getState
  >['clearAllConversations'];
}

export function CorpoLayout({
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
}: CorpoLayoutProps) {
  const handleConversationSelectAndClose = () => {
    onConversationSelect();
    onDrawerOpenChange(false);
  };

  const openSettingsAndClose = () => {
    onShowPerformanceSettings();
    onDrawerOpenChange(false);
  };

  return (
    <Box
      position="relative"
      h="100vh"
      w="100%"
      display="flex"
      flexDirection="column"
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
                minW="200px"
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

      {/* Left drawer */}
      <Drawer.Root
        open={drawerOpen}
        onOpenChange={(e) => onDrawerOpenChange(e.open)}
        placement="start"
        size="md"
      >
        <Drawer.Backdrop />
        <Portal>
          <Drawer.Positioner>
            <Drawer.Content
              bg="rgba(0, 0, 0, 0.85)"
              borderRight="0px"
              borderColor="rgba(255, 255, 255, 0.08)"
              fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            >
              <Drawer.Header
                borderBottom="1px solid"
                borderColor="rgba(255, 255, 255, 0.08)"
              >
                <Drawer.Title color="gray.200" fontSize="sm">
                  Menu
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
          w="75vw"
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
        w="75vw"
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
