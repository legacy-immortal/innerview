/**
 * @file Zustand conversation store: CRUD, message storage, and import actions over localforage.
 * @module lib/conversation-store.ts
 */
// Conversation state management with Zustand
// Storage: Uses localforage (IndexedDB/WebSQL/localStorage fallback) for better performance
// and larger storage capacity compared to localStorage alone
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Conversation,
  ConversationMessage,
  ConversationStore,
} from './conversationTypes';
import {
  generateConversationId,
  localforageStorage,
} from './conversationStorage';
import {
  buildImportedConversation,
  dedupeMessages,
  nowIso,
  uiMessageToConversationMessage,
} from './conversationMessageUtils';

export type {
  Conversation,
  ConversationMessage,
  ConversationStore,
} from './conversationTypes';

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,

      createConversation: () => {
        const id = generateConversationId();
        const now = new Date().toISOString();
        const conversation: Conversation = {
          id,
          title: 'New Conversation',
          createdAt: now,
          updatedAt: now,
          messageCount: 0,
        };

        set({
          conversations: [...get().conversations, conversation],
          currentConversationId: id,
        });

        return id;
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id });
      },

      deleteConversation: (id) => {
        const conversations = get().conversations.filter((c) => c.id !== id);
        const currentId = get().currentConversationId;

        set({
          conversations,
          currentConversationId: currentId === id ? null : currentId,
        });
      },

      updateConversationTitle: (id, title) => {
        set({
          conversations: get().conversations.map((c) =>
            c.id === id
              ? { ...c, title, updatedAt: new Date().toISOString() }
              : c
          ),
        });
      },

      updateConversationPreview: (id, preview) => {
        set({
          conversations: get().conversations.map((c) =>
            c.id === id
              ? { ...c, preview, updatedAt: new Date().toISOString() }
              : c
          ),
        });
      },

      incrementMessageCount: (id) => {
        set({
          conversations: get().conversations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  messageCount: c.messageCount + 1,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        });
      },

      setMessageCount: (id, count) => {
        try {
          set({
            conversations: get().conversations.map((c) =>
              c.id === id
                ? {
                    ...c,
                    messageCount: count,
                    updatedAt: new Date().toISOString(),
                  }
                : c
            ),
          });
        } catch (error) {
          console.error('Failed to update message count:', error);
        }
      },

      saveConversationMessages: (id, messages) => {
        try {
          set({
            conversations: get().conversations.map((c) =>
              c.id === id
                ? {
                    ...c,
                    messages,
                    updatedAt: new Date().toISOString(),
                  }
                : c
            ),
          });
        } catch (error) {
          console.error('Failed to save conversation messages:', error);
          // Try to save with reduced message count
          try {
            const reducedMessages = messages.slice(-50); // Keep only last 50 messages
            set({
              conversations: get().conversations.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      messages: reducedMessages,
                      messageCount: reducedMessages.length,
                      updatedAt: new Date().toISOString(),
                    }
                  : c
              ),
            });
            console.warn(
              'Saved conversation with reduced message history due to storage constraints'
            );
          } catch (reducedError) {
            console.error(
              'Failed to save even reduced conversation messages:',
              reducedError
            );
          }
        }
      },

      loadConversationMessages: (id) => {
        const conversation = get().conversations.find((c) => c.id === id);
        return conversation?.messages;
      },

      clearConversationMessages: (id) => {
        set({
          conversations: get().conversations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  messages: [],
                  messageCount: 0,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        });
      },

      removeConversationMessage: (conversationId, messageId) => {
        const conversation = get().conversations.find(
          (c) => c.id === conversationId
        );
        if (!conversation?.messages) return;
        const next = conversation.messages.filter((m) => m.id !== messageId);
        get().saveConversationMessages(conversationId, next);
        get().setMessageCount(conversationId, next.length);
      },

      appendConversationMessage: (id, message) => {
        try {
          const conversation = get().conversations.find((c) => c.id === id);
          if (conversation) {
            const existingMessages = conversation.messages || [];
            // Check if message already exists to prevent duplicates
            const messageExists = existingMessages.some(
              (msg) => msg.id === message.id
            );
            if (messageExists) {
              return; // Don't add duplicate
            }
            set({
              conversations: get().conversations.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      messages: [...existingMessages, message],
                      messageCount: existingMessages.length + 1,
                      updatedAt: new Date().toISOString(),
                    }
                  : c
              ),
            });
          }
        } catch (error) {
          console.error('Failed to append conversation message:', error);
        }
      },

      // Legacy compatibility methods for backward compatibility
      getCurrentConversationId: () => {
        const id = get().currentConversationId;
        if (id) {
          return id;
        }

        // Generate new conversation if none exists
        return get().createConversation();
      },

      setCurrentConversationId: (conversationId: string) => {
        get().setCurrentConversation(conversationId);
      },

      createNewConversation: () => {
        return get().createConversation();
      },

      // Dev mode triage functions
      purgeDuplicateMessages: (conversationId) => {
        const targets = conversationId
          ? get().conversations.filter((c) => c.id === conversationId)
          : get().conversations;
        for (const conversation of targets) {
          if (!conversation.messages?.length) continue;
          const uniqueMessages = dedupeMessages(conversation.messages);
          if (
            conversationId ||
            uniqueMessages.length !== conversation.messages.length
          ) {
            get().saveConversationMessages(conversation.id, uniqueMessages);
            get().setMessageCount(conversation.id, uniqueMessages.length);
          }
        }
      },

      clearAllConversations: () => {
        set({
          conversations: [],
          currentConversationId: null,
        });
      },
      importConversation: (conversation, messages, conversationMessages?) => {
        const id = conversation.id || generateConversationId();
        const importedConversation = buildImportedConversation(
          conversation,
          messages.length,
          id
        );
        const messagesToStore: ConversationMessage[] = conversationMessages
          ? conversationMessages
          : messages.map((msg) =>
              uiMessageToConversationMessage(
                msg,
                importedConversation.createdAt
              )
            );
        set({
          conversations: [...get().conversations, importedConversation],
          currentConversationId: id,
        });
        get().saveConversationMessages(id, messagesToStore);
        return id;
      },

      importConversations: (conversationsData) => {
        const existing = get().conversations;
        const imported: Conversation[] = [];
        const conversationsWithMessages: Array<{
          id: string;
          messages: ConversationMessage[];
        }> = [];

        for (const { conversation, messages } of conversationsData) {
          const id = conversation.id || generateConversationId();
          const importedConversation = buildImportedConversation(
            conversation,
            messages.length,
            id
          );
          const conversationMessages = messages.map((msg) =>
            uiMessageToConversationMessage(msg, nowIso())
          );
          imported.push(importedConversation);
          conversationsWithMessages.push({
            id,
            messages: conversationMessages,
          });
        }

        set({ conversations: [...existing, ...imported] });
        for (const {
          id,
          messages: conversationMessages,
        } of conversationsWithMessages) {
          get().saveConversationMessages(id, conversationMessages);
        }
      },
    }),
    {
      name: 'innerview-conversations',
      storage: localforageStorage,
      // Persist conversations with messages and currentConversationId
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);

// Legacy export for backward compatibility
export const conversationStore = {
  getCurrentConversationId: () =>
    useConversationStore.getState().getCurrentConversationId(),
  setCurrentConversationId: (id: string) =>
    useConversationStore.getState().setCurrentConversationId(id),
  createNewConversation: () =>
    useConversationStore.getState().createNewConversation(),
};
