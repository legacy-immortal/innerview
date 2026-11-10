/**
 * @file ChatDebugMenu.tsx — Debug overlay for exporting conversations and inspecting store state.
 * @module components/chat/shared/ChatDebugMenu
 *
 * Debug overlay for exporting conversations and inspecting store state. Provides TTS toggle,
 * performance settings, JSON/markdown export, conversation import, duplicate purging, and a
 * confirmed clear-all history action. Consumed by `ChatHeader`.
 */

import { toaster } from '@/components/ui/toaster';
import {
  exportAndDownloadJSON,
  exportAndDownloadPlaintext,
} from '@/lib/conversation-exporter';
import { useConversationStore } from '@/lib/conversation-store';
import { Box, HStack, Menu, Text } from '@chakra-ui/react';
import React from 'react';
import {
  HiDocumentRemove,
  HiDownload,
  HiStop,
  HiTrash,
  HiUpload,
  HiVolumeOff,
  HiVolumeUp,
} from 'react-icons/hi';
import { LuSettings } from 'react-icons/lu';
import type { ConversationListRef } from '../condensed/ConversationList';
import {
  emeraldTextShadowStyles,
  grayTextShadowStyles,
  redTextShadowStyles,
  stopMenuItemStyles,
  textShadowStyles,
  yellowTextShadowStyles,
} from './ChatStyles';

interface ChatDebugMenuProps {
  readonly ttsEnabled: boolean;
  readonly onTtsToggle: () => void;
  readonly isTTSSpeaking: boolean;
  readonly onStop: () => void;
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

/**
 * Debug overlay for exporting conversations and inspecting store state.
 *
 * @param props - Chat debug menu props.
 * @returns The debug menu element.
 */
export const ChatDebugMenu = ({
  ttsEnabled,
  onTtsToggle,
  isTTSSpeaking,
  onStop,
  onShowPerformanceSettings,
  effectiveConversationId,
  conversations,
  loadConversationMessages,
  purgeDuplicateMessages,
  clearAllConversations,
  createConversation,
  conversationListRef,
}: ChatDebugMenuProps): React.JSX.Element => {
  return (
    <>
      <Menu.Item
        value="tts-toggle"
        onClick={onTtsToggle}
        bg="transparent"
        color="gray.200"
        css={textShadowStyles}
        _hover={{
          bg: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          borderLeft: '2px solid',
          borderColor: 'cyan.400',
          textShadow: '0 0 8px rgba(34, 211, 238, 0.6)',
        }}
        _focus={{
          bg: 'rgba(255, 255, 255, 0.12)',
          color: 'white',
          borderLeft: '2px solid',
          borderColor: 'cyan.400',
        }}
        transition="all 0.2s ease"
        borderLeft="2px solid transparent"
      >
        <HStack gap={1}>
          {ttsEnabled ? <HiVolumeUp /> : <HiVolumeOff />}
          <Text>TTS: {ttsEnabled ? 'On' : 'Off'}</Text>
        </HStack>
      </Menu.Item>
      {ttsEnabled && isTTSSpeaking ? (
        <Menu.Item
          value="stop"
          onClick={onStop}
          bg="transparent"
          color="red.400"
          _hover={{
            bg: 'rgba(239, 68, 68, 0.15)',
            color: 'red.300',
            borderLeft: '2px solid',
            borderColor: 'red.400',
            textShadow: '0 0 12px rgba(239, 68, 68, 0.8)',
          }}
          _focus={{
            bg: 'rgba(239, 68, 68, 0.2)',
            color: 'red.300',
            borderLeft: '2px solid',
            borderColor: 'red.400',
          }}
          css={stopMenuItemStyles}
          transition="all 0.2s ease"
          borderLeft="2px solid transparent"
        >
          <HStack gap={1}>
            <HiStop />
            <Text>Stop</Text>
          </HStack>
        </Menu.Item>
      ) : null}
      {ttsEnabled && !isTTSSpeaking && (
        <Menu.Item
          value="status-ready"
          disabled
          bg="transparent"
          opacity={1}
          cursor="default"
        >
          <Text fontSize="xs" color="gray.400" css={grayTextShadowStyles}>
            Voice synthesis ready
          </Text>
        </Menu.Item>
      )}
      {ttsEnabled && isTTSSpeaking && (
        <Menu.Item
          value="status-speaking"
          disabled
          bg="transparent"
          opacity={1}
          cursor="default"
        >
          <Text fontSize="xs" color="emerald.400" css={emeraldTextShadowStyles}>
            Speaking...
          </Text>
        </Menu.Item>
      )}
      <Menu.Item
        value="performance-settings"
        onClick={onShowPerformanceSettings}
        bg="transparent"
        color="gray.200"
        css={textShadowStyles}
        _hover={{
          bg: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          borderLeft: '2px solid',
          borderColor: 'cyan.400',
          textShadow: '0 0 8px rgba(34, 211, 238, 0.6)',
        }}
        _focus={{
          bg: 'rgba(255, 255, 255, 0.12)',
          color: 'white',
          borderLeft: '2px solid',
          borderColor: 'cyan.400',
        }}
        transition="all 0.2s ease"
        borderLeft="2px solid transparent"
      >
        <HStack gap={1}>
          <LuSettings />
          <Text>Settings</Text>
        </HStack>
      </Menu.Item>
      {effectiveConversationId && (
        <>
          <Menu.Item
            value="export-json"
            onClick={() => {
              const conversation = conversations.find(
                (c) => c.id === effectiveConversationId
              );
              if (!conversation) return;

              const messages = loadConversationMessages(
                effectiveConversationId
              );
              if (!messages || messages.length === 0) {
                toaster.create({
                  title: 'No messages to export',
                  description: 'This conversation has no messages.',
                  type: 'warning',
                  duration: 3000,
                  meta: { closable: true },
                });
                return;
              }

              try {
                exportAndDownloadJSON(conversation, messages);
                toaster.create({
                  title: 'Conversation exported',
                  description: `"${conversation.title}" has been exported as JSON.`,
                  type: 'success',
                  duration: 3000,
                  meta: { closable: true },
                });
              } catch (error) {
                console.error('Export error:', error);
                toaster.create({
                  title: 'Export failed',
                  description:
                    error instanceof Error
                      ? error.message
                      : 'Failed to export conversation',
                  type: 'error',
                  duration: 5000,
                  meta: { closable: true },
                });
              }
            }}
            bg="transparent"
            color="gray.200"
            css={textShadowStyles}
            _hover={{
              bg: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              borderLeft: '2px solid',
              borderColor: 'cyan.400',
              textShadow: '0 0 8px rgba(34, 211, 238, 0.6)',
            }}
            _focus={{
              bg: 'rgba(255, 255, 255, 0.12)',
              color: 'white',
              borderLeft: '2px solid',
              borderColor: 'cyan.400',
            }}
            transition="all 0.2s ease"
            borderLeft="2px solid transparent"
          >
            <HStack gap={1}>
              <HiDownload />
              <Text>Export JSON</Text>
            </HStack>
          </Menu.Item>
          <Menu.Item
            value="export-txt"
            onClick={() => {
              const conversation = conversations.find(
                (c) => c.id === effectiveConversationId
              );
              if (!conversation) return;

              const messages = loadConversationMessages(
                effectiveConversationId
              );
              if (!messages || messages.length === 0) {
                toaster.create({
                  title: 'No messages to export',
                  description: 'This conversation has no messages.',
                  type: 'warning',
                  duration: 3000,
                  meta: { closable: true },
                });
                return;
              }

              try {
                exportAndDownloadPlaintext(conversation, messages);
                toaster.create({
                  title: 'Conversation exported',
                  description: `"${conversation.title}" has been exported as markdown.`,
                  type: 'success',
                  duration: 3000,
                  meta: { closable: true },
                });
              } catch (error) {
                console.error('Export error:', error);
                toaster.create({
                  title: 'Export failed',
                  description:
                    error instanceof Error
                      ? error.message
                      : 'Failed to export conversation',
                  type: 'error',
                  duration: 5000,
                  meta: { closable: true },
                });
              }
            }}
            bg="transparent"
            color="gray.200"
            css={textShadowStyles}
            _hover={{
              bg: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              borderLeft: '2px solid',
              borderColor: 'cyan.400',
              textShadow: '0 0 8px rgba(34, 211, 238, 0.6)',
            }}
            _focus={{
              bg: 'rgba(255, 255, 255, 0.12)',
              color: 'white',
              borderLeft: '2px solid',
              borderColor: 'cyan.400',
            }}
            transition="all 0.2s ease"
            borderLeft="2px solid transparent"
          >
            <HStack gap={1}>
              <HiDownload />
              <Text>Export Markdown</Text>
            </HStack>
          </Menu.Item>
        </>
      )}
      <Menu.Item
        value="import-conversations"
        onClick={() => {
          conversationListRef.current?.triggerImport();
        }}
        bg="transparent"
        color="cyan.400"
        _hover={{
          bg: 'rgba(34, 211, 238, 0.15)',
          color: 'cyan.300',
          borderLeft: '2px solid',
          borderColor: 'cyan.400',
          textShadow: '0 0 12px rgba(34, 211, 238, 0.8)',
        }}
        _focus={{
          bg: 'rgba(34, 211, 238, 0.2)',
          color: 'cyan.300',
          borderLeft: '2px solid',
          borderColor: 'cyan.400',
        }}
        css={textShadowStyles}
        transition="all 0.2s ease"
        borderLeft="2px solid transparent"
      >
        <HStack gap={1}>
          <HiUpload />
          <Text>Import Conversations</Text>
        </HStack>
      </Menu.Item>
      <Menu.Item
        value="dev-separator"
        disabled
        bg="transparent"
        opacity={0.3}
        cursor="default"
        py={1}
      >
        <Box w="100%" h="1px" bg="rgba(255, 255, 255, 0.1)" />
      </Menu.Item>
      <Menu.Item
        value="purge-duplicates"
        onClick={() => {
          purgeDuplicateMessages(effectiveConversationId);
        }}
        bg="transparent"
        color="yellow.400"
        _hover={{
          bg: 'rgba(250, 204, 21, 0.15)',
          color: 'yellow.300',
          borderLeft: '2px solid',
          borderColor: 'yellow.400',
          textShadow: '0 0 12px rgba(250, 204, 21, 0.8)',
        }}
        _focus={{
          bg: 'rgba(250, 204, 21, 0.2)',
          color: 'yellow.300',
          borderLeft: '2px solid',
          borderColor: 'yellow.400',
        }}
        css={yellowTextShadowStyles}
        transition="all 0.2s ease"
        borderLeft="2px solid transparent"
      >
        <HStack gap={1}>
          <HiDocumentRemove />
          <Text>Purge Duplicates</Text>
        </HStack>
      </Menu.Item>
      <Menu.Item
        value="clear-all"
        onClick={() => {
          if (
            window.confirm(
              '⚠️ WARNING: This will delete ALL conversations and messages. This cannot be undone. Are you sure?'
            )
          ) {
            clearAllConversations();
            createConversation();
          }
        }}
        bg="transparent"
        color="red.400"
        _hover={{
          bg: 'rgba(239, 68, 68, 0.15)',
          color: 'red.300',
          borderLeft: '2px solid',
          borderColor: 'red.400',
          textShadow: '0 0 12px rgba(239, 68, 68, 0.8)',
        }}
        _focus={{
          bg: 'rgba(239, 68, 68, 0.2)',
          color: 'red.300',
          borderLeft: '2px solid',
          borderColor: 'red.400',
        }}
        css={redTextShadowStyles}
        transition="all 0.2s ease"
        borderLeft="2px solid transparent"
      >
        <HStack gap={1}>
          <HiTrash />
          <Text>Clear All History</Text>
        </HStack>
      </Menu.Item>
    </>
  );
};
