/**
 * @file ChatHeader.tsx — Header bar for the condensed chat layout (title, actions).
 * @module components/chat/condensed/ChatHeader
 *
 * Header bar for the condensed chat layout (title, actions). Renders the provider-status
 * dot, backend load indicator, debug menu, and the stop/regenerate/new-conversation action
 * buttons. Consumed by `StandardModeView` and `CorpoModeView` via `ChatDebugMenu`.
 */

import { Tooltip } from '@/components/ui/tooltip';
import type { useConversationStore } from '@/lib/conversation-store';
import {
  getProviderStatusColor,
  getProviderStatusMessage,
  useProviderStatusStore,
} from '@/lib/provider-status';
import { Box, HStack, IconButton, Menu, Portal, Text } from '@chakra-ui/react';
import React, { memo, useEffect, useRef } from 'react';
import {
  HiChatAlt,
  HiCollection,
  HiPlus,
  HiRefresh,
  HiStop,
} from 'react-icons/hi';
import { LuSettings } from 'react-icons/lu';
import { ChatDebugMenu } from '../shared/ChatDebugMenu';
import { headerTextShadowStyles } from '../shared/ChatStyles';
import { BackendStatusIndicator } from './BackendStatusIndicator';
import type { ConversationListRef } from './ConversationList';

interface ChatHeaderProps {
  readonly showConversationList: boolean;
  readonly onToggleConversationList: () => void;
  readonly onCreateConversation: () => void;
  readonly canStop: boolean;
  readonly onStop: () => void;
  readonly canRegenerate: boolean;
  readonly onRegenerate: () => void;
  readonly sidebarHeaderBackgroundColor: string;
  readonly ttsEnabled: boolean;
  readonly onTtsToggle: () => void;
  readonly isTTSSpeaking: boolean;
  readonly onStopAudio: () => void;
  readonly onShowPerformanceSettings: () => void;
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
  readonly createConversation: ReturnType<
    typeof useConversationStore.getState
  >['createConversation'];
  readonly conversationListRef: React.RefObject<ConversationListRef | null>;
}

const ChatHeaderComponent = ({
  showConversationList,
  onToggleConversationList,
  onCreateConversation,
  canStop,
  onStop,
  canRegenerate,
  onRegenerate,
  sidebarHeaderBackgroundColor,
  ttsEnabled,
  onTtsToggle,
  isTTSSpeaking,
  onStopAudio,
  onShowPerformanceSettings,
  effectiveConversationId,
  conversations,
  loadConversationMessages,
  purgeDuplicateMessages,
  clearAllConversations,
  createConversation,
  conversationListRef,
}: ChatHeaderProps) => {
  const providerStatus = useProviderStatusStore(
    (state) => state.providerStatus
  );
  const checkProvider = useProviderStatusStore((state) => state.checkProvider);
  const checkRef = useRef(checkProvider);
  checkRef.current = checkProvider;

  // Check provider status on mount and periodically (throttled; paused when hidden)
  useEffect(() => {
    checkRef.current();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      checkRef.current();
    }, 120000); // Check every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const statusColor = getProviderStatusColor(providerStatus);
  const statusMessage = getProviderStatusMessage(providerStatus);

  return (
    <Box
      p={3}
      borderBottom="1px solid"
      borderColor="rgba(255, 255, 255, 0.08)"
      position="relative"
      bg={sidebarHeaderBackgroundColor}
    >
      <HStack justify="space-between" align="center" flexWrap="wrap" minW={0}>
        <HStack gap={2} flexWrap="wrap" minW={0}>
          {/* Provider status indicator */}
          <Tooltip
            content={statusMessage}
            positioning={{ placement: 'bottom' }}
          >
            <Box
              w="8px"
              h="8px"
              borderRadius="full"
              bg={
                statusColor === 'green'
                  ? 'green.400'
                  : statusColor === 'yellow'
                    ? 'yellow.400'
                    : statusColor === 'red'
                      ? 'red.400'
                      : 'gray.500'
              }
              css={{
                boxShadow:
                  statusColor === 'green'
                    ? '0 0 8px rgba(34, 197, 94, 0.6)'
                    : statusColor === 'yellow'
                      ? '0 0 8px rgba(234, 179, 8, 0.6)'
                      : statusColor === 'red'
                        ? '0 0 8px rgba(239, 68, 68, 0.6)'
                        : 'none',
                animation:
                  statusColor === 'yellow' ? 'pulse 2s infinite' : 'none',
              }}
              cursor="pointer"
              onClick={() => checkProvider()}
            />
          </Tooltip>
          {/* Backend load indicator (GET /api/status) */}
          <BackendStatusIndicator />
          <Menu.Root
            positioning={{
              placement: 'bottom-start',
              strategy: 'fixed',
            }}
            lazyMount
            skipAnimationOnMount
            immediate
          >
            <Menu.Trigger asChild>
              <IconButton
                aria-label="Debug menu"
                size="sm"
                variant="ghost"
                colorPalette="gray"
                fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                w="8"
                h="8"
              >
                <LuSettings />
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content
                  bg="transparent"
                  borderRadius="none"
                  minW={{ base: 'min(200px, 85vw)', md: '200px' }}
                  maxW="calc(100vw - 2rem)"
                  p={0}
                >
                  <ChatDebugMenu
                    ttsEnabled={ttsEnabled}
                    onTtsToggle={onTtsToggle}
                    isTTSSpeaking={isTTSSpeaking}
                    onStop={onStopAudio}
                    onShowPerformanceSettings={onShowPerformanceSettings}
                    effectiveConversationId={effectiveConversationId}
                    conversations={conversations}
                    loadConversationMessages={loadConversationMessages}
                    purgeDuplicateMessages={purgeDuplicateMessages}
                    clearAllConversations={clearAllConversations}
                    createConversation={createConversation}
                    conversationListRef={conversationListRef}
                  />
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
          <Text
            fontSize="xs"
            color="gray.400"
            fontWeight={600}
            letterSpacing="0.1em"
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            css={headerTextShadowStyles}
          >
            {showConversationList ? 'CONVERSATIONS' : 'MESSAGES'}
          </Text>
        </HStack>
        <HStack gap={2} flexWrap="wrap" minW={0}>
          {!showConversationList && (
            <>
              {canStop && (
                <IconButton
                  aria-label="Stop generation"
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  onClick={onStop}
                >
                  <HiStop />
                </IconButton>
              )}
              {canRegenerate && (
                <IconButton
                  aria-label="Regenerate response"
                  size="sm"
                  variant="ghost"
                  colorPalette="blue"
                  onClick={onRegenerate}
                >
                  <HiRefresh />
                </IconButton>
              )}
            </>
          )}
          {showConversationList && (
            <IconButton
              aria-label="New conversation"
              size="sm"
              variant="ghost"
              colorPalette="gray"
              onClick={onCreateConversation}
            >
              <HiPlus />
            </IconButton>
          )}
          <IconButton
            aria-label={
              showConversationList ? 'Show messages' : 'Show conversations'
            }
            size="sm"
            variant="ghost"
            colorPalette="gray"
            onClick={onToggleConversationList}
          >
            {showConversationList ? <HiChatAlt /> : <HiCollection />}
          </IconButton>
        </HStack>
      </HStack>
    </Box>
  );
};

/**
 * Memoized chat header with navigation and controls.
 *
 * @returns The memoized chat header element.
 */
export const ChatHeader = memo(ChatHeaderComponent);
