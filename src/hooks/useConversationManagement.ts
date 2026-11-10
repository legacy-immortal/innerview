/**
 * @file useConversationManagement.ts — Conversation management hook for loading/saving messages and generating titles.
 * @module hooks/useConversationManagement
 *
 * Conversation management hook for loading/saving messages and generating
 * titles. Ensures a conversation exists, converts and deduplicates stored
 * messages to UIMessage format, tracks message counts, handles chat finish
 * callbacks (saving assistant messages and generating conversation titles),
 * and builds submit handlers for user messages.
 */
import {
  useConversationStore,
  type ConversationMessage,
} from '@/lib/conversation-store';
import { generateConversationTitle } from '@/lib/title-generator';
import {
  convertStoreToMessages,
  extractMessageText,
} from '@/utils/message-conversion';
import type { UIMessage } from 'ai';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Conversation management hook for loading/saving messages and generating
 * titles. Ensures a conversation exists (skipping auto-creation in terminal
 * mode), converts and deduplicates stored messages to UIMessage format,
 * tracks message counts, handles chat finish callbacks (saving assistant
 * messages and generating conversation titles from the first user message),
 * and builds submit handlers for user messages.
 * @param reasoningTag - Reasoning tag used when converting stored messages.
 * @param layoutMode - Optional layout mode ('condensed' | 'corpo' | 'terminal').
 * @returns Conversation id, list, display messages, chat finish handler,
 * submit handler creator, and store actions.
 * @example
 * ```tsx
 * const { effectiveConversationId, conversations, displayMessages,
 *   handleChatFinish, createSubmitHandler } = useConversationManagement(
 *   reasoningTag, layoutMode
 * );
 * ```
 */
export const useConversationManagement = (
  reasoningTag: string,
  layoutMode?: 'condensed' | 'corpo' | 'terminal'
) => {
  const currentConversationId = useConversationStore(
    (state) => state.currentConversationId
  );
  const createConversation = useConversationStore(
    (state) => state.createConversation
  );
  const getCurrentConversationId = useConversationStore(
    (state) => state.getCurrentConversationId
  );
  const loadConversationMessages = useConversationStore(
    (state) => state.loadConversationMessages
  );
  const updateConversationPreview = useConversationStore(
    (state) => state.updateConversationPreview
  );
  const updateConversationTitle = useConversationStore(
    (state) => state.updateConversationTitle
  );
  const setMessageCount = useConversationStore(
    (state) => state.setMessageCount
  );
  const appendConversationMessage = useConversationStore(
    (state) => state.appendConversationMessage
  );

  const conversations = useConversationStore(
    useShallow((state) => state.conversations)
  );

  // Ensure we have a conversation ID (create one if needed)
  // Skip auto-creation in terminal mode - let user explicitly start conversations
  useEffect(() => {
    if (!currentConversationId && layoutMode !== 'terminal') {
      createConversation();
    }
  }, [currentConversationId, createConversation, layoutMode]);

  const effectiveConversationId =
    currentConversationId || getCurrentConversationId();

  // Convert and deduplicate messages only when conversations or conversationId change
  const displayMessages: UIMessage[] = useMemo(() => {
    const conversation = conversations.find(
      (c) => c.id === effectiveConversationId
    );
    const storedMessages = conversation?.messages;

    if (storedMessages && storedMessages.length > 0) {
      // Convert stored messages to UIMessage format
      const uiMessages = convertStoreToMessages(storedMessages, reasoningTag);

      // Deduplicate messages by ID to prevent duplicate keys
      const seenIds = new Set<string>();
      const deduplicated = uiMessages.filter((msg) => {
        if (seenIds.has(msg.id)) {
          return false;
        }
        seenIds.add(msg.id);
        return true;
      });

      return deduplicated;
    }
    return [];
  }, [conversations, effectiveConversationId, reasoningTag]);

  // Track conversation changes to update message count
  useEffect(() => {
    if (effectiveConversationId) {
      const storedMessages = loadConversationMessages(effectiveConversationId);
      if (storedMessages) {
        setMessageCount(effectiveConversationId, storedMessages.length);
      }
    }
  }, [effectiveConversationId, loadConversationMessages, setMessageCount]);

  // Handle responses from the chat API and save assistant messages to store
  const handleChatFinish = useCallback(
    async (options: {
      message: UIMessage;
      messages: UIMessage[];
      isAbort: boolean;
      isDisconnect: boolean;
      isError: boolean;
    }) => {
      // Only process if it's not an error, abort, or disconnect
      if (options.isError || options.isAbort || options.isDisconnect) {
        return;
      }

      // Save the assistant message
      if (options.message && options.message.role === 'assistant') {
        // Extract timestamp from message if available (from server), otherwise use current time
        const messageTimestamp =
          (options.message as unknown as { createdAt?: string }).createdAt ||
          new Date().toISOString();

        // Convert to ConversationMessage format and save
        const assistantMessage: ConversationMessage = {
          id:
            options.message.id ||
            `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: 'assistant',
          content: extractMessageText(options.message),
          createdAt: messageTimestamp,
          parts: options.message.parts as ConversationMessage['parts'],
        };

        appendConversationMessage(effectiveConversationId, assistantMessage);
        updateConversationPreview(
          effectiveConversationId,
          assistantMessage.content.slice(0, 100)
        );

        // Generate title after first assistant response (when we have 1 user + 1 assistant message)
        const storedMessages = loadConversationMessages(
          effectiveConversationId
        );
        const conversation = conversations.find(
          (c) => c.id === effectiveConversationId
        );

        if (
          conversation &&
          conversation.title === 'New Conversation' &&
          storedMessages &&
          storedMessages.length === 2 &&
          storedMessages[0]?.role === 'user' &&
          storedMessages[1]?.role === 'assistant'
        ) {
          // Generate title from the first user message
          const firstUserMessage = storedMessages[0].content;
          if (firstUserMessage && firstUserMessage.trim()) {
            try {
              const title = await generateConversationTitle(firstUserMessage);
              updateConversationTitle(effectiveConversationId, title);
            } catch (error) {
              console.warn(
                '[InterlocutorChat] Failed to generate title:',
                error
              );
              // Fallback: use first 50 chars of user message
              const fallbackTitle =
                firstUserMessage.slice(0, 50).trim() +
                (firstUserMessage.length > 50 ? '...' : '');
              updateConversationTitle(effectiveConversationId, fallbackTitle);
            }
          }
        }
      }
    },

    [
      effectiveConversationId,
      appendConversationMessage,
      updateConversationPreview,
      updateConversationTitle,
      loadConversationMessages,
      conversations,
    ]
  );

  const createSubmitHandler = useCallback(
    (sendMessage: (options: { text: string }) => void) => {
      return (text: string) => {
        if (!text.trim()) return;

        // Save user message to store immediately
        const userMessage: ConversationMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: 'user',
          content: text,
          createdAt: new Date().toISOString(),
        };

        appendConversationMessage(effectiveConversationId, userMessage);
        updateConversationPreview(effectiveConversationId, text.slice(0, 100));

        sendMessage({ text });
      };
    },
    [
      effectiveConversationId,
      appendConversationMessage,
      updateConversationPreview,
    ]
  );

  return {
    effectiveConversationId,
    conversations,
    displayMessages,
    handleChatFinish,
    createSubmitHandler,
    createConversation,
    loadConversationMessages,
  };
};
