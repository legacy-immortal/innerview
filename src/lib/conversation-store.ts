// Conversation state management with Zustand
// Storage: Uses localforage (IndexedDB/WebSQL/localStorage fallback) for better performance
// and larger storage capacity compared to localStorage alone
import localforage from 'localforage';
import { create } from 'zustand';
import { StateStorage, createJSONStorage, persist } from 'zustand/middleware';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  // Support for messages with parts (for imported conversations)
  parts?: Array<{
    type: string;
    text?: string;
    filename?: string;
    url?: string;
    mediaType?: string;
    state?: string;
    // Citation support
    citations?: Array<{
      id?: string;
      title?: string;
      url?: string;
      snippet?: string;
    }>;
    // Tool call support
    toolCallId?: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    // Web search results
    searchResults?: Array<{
      title?: string;
      url?: string;
      snippet?: string;
    }>;
  }>;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string;
  messages?: ConversationMessage[];
}

interface ConversationStore {
  conversations: Conversation[];
  currentConversationId: string | null;

  // Actions
  createConversation: () => string;
  setCurrentConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  updateConversationPreview: (id: string, preview: string) => void;
  incrementMessageCount: (id: string) => void;
  setMessageCount: (id: string, count: number) => void;

  // Message storage actions
  saveConversationMessages: (
    id: string,
    messages: ConversationMessage[]
  ) => void;
  loadConversationMessages: (id: string) => ConversationMessage[] | undefined;
  clearConversationMessages: (id: string) => void;
  appendConversationMessage: (id: string, message: ConversationMessage) => void;
  removeConversationMessage: (
    conversationId: string,
    messageId: string
  ) => void;

  // Import actions
  importConversation: (
    conversation: Conversation,
    messages: Array<{ id: string; role: string; parts?: unknown[] }>,
    conversationMessages?: ConversationMessage[]
  ) => string;
  importConversations: (
    conversations: Array<{
      conversation: Conversation;
      messages: Array<{ id: string; role: string; parts?: unknown[] }>;
    }>
  ) => void;

  // Legacy compatibility methods
  getCurrentConversationId: () => string;
  setCurrentConversationId: (id: string) => void;
  createNewConversation: () => string;

  // Dev mode triage functions
  purgeDuplicateMessages: (conversationId?: string) => void;
  clearAllConversations: () => void;
}

const generateConversationId = (): string => {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Storage quota management
const MAX_CONVERSATIONS = 50; // Limit to 50 conversations
const MAX_MESSAGES_PER_CONVERSATION = 100; // Limit to 100 messages per conversation

// Initialize localforage instance for conversations
const conversationForage = localforage.createInstance({
  name: 'innerview',
  storeName: 'conversations',
  description: 'Conversation storage for Innerview',
});

// Custom storage adapter for localforage with error handling
const localforageStateStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await conversationForage.getItem<string>(name);
      return value;
    } catch (error) {
      console.warn('Failed to load conversations from storage:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await conversationForage.setItem(name, value);
    } catch (error) {
      // Check for quota exceeded errors
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        console.warn(
          'Storage quota exceeded, cleaning up old conversations...'
        );

        // Try to clean up and retry
        try {
          const currentDataRaw = await conversationForage.getItem<string>(name);

          if (currentDataRaw) {
            const dataObj = JSON.parse(currentDataRaw) as {
              state?: { conversations?: Conversation[] };
              version?: number;
            };
            const conversations = dataObj.state?.conversations;

            if (conversations) {
              // Keep only the most recent 20 conversations
              const cleanedConversations = conversations
                .sort(
                  (a: Conversation, b: Conversation) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime()
                )
                .slice(0, 20)
                .map((conv: Conversation) => ({
                  ...conv,
                  messages: conv.messages?.slice(-50) || [], // Keep only last 50 messages
                  messageCount: Math.min(conv.messageCount, 50),
                }));

              const cleanedData = {
                state: {
                  ...dataObj.state,
                  conversations: cleanedConversations,
                },
                version: dataObj.version,
              };

              await conversationForage.setItem(
                name,
                JSON.stringify(cleanedData)
              );
              console.log('Cleaned up conversations to free storage space');
            }
          }
        } catch (cleanupError) {
          console.error('Failed to clean up storage:', cleanupError);
          // If cleanup fails, clear all data
          try {
            await conversationForage.removeItem(name);
            console.warn(
              'Cleared all conversation data due to storage quota issues'
            );
          } catch (clearError) {
            console.error('Failed to clear storage:', clearError);
          }
        }
      } else {
        console.error('Storage error:', error);
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await conversationForage.removeItem(name);
    } catch (error) {
      console.warn('Failed to remove item from storage:', error);
    }
  },
};

// Wrap with createJSONStorage and apply quota limits via replacer
const localforageStorage = createJSONStorage(() => localforageStateStorage, {
  replacer: (key, value) => {
    // If storing conversations, apply limits
    if (key === 'conversations' && Array.isArray(value)) {
      // Sort by updatedAt (most recent first)
      const sorted = value.sort(
        (a: Conversation, b: Conversation) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Limit number of conversations
      let limited = sorted.slice(0, MAX_CONVERSATIONS);

      // Limit messages per conversation
      limited = limited.map((conv: Conversation) => ({
        ...conv,
        messages: conv.messages?.slice(-MAX_MESSAGES_PER_CONVERSATION) || [],
        messageCount: Math.min(
          conv.messageCount,
          MAX_MESSAGES_PER_CONVERSATION
        ),
      }));

      return limited;
    }
    return value;
  },
});

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
        if (conversationId) {
          // Purge duplicates from a specific conversation
          const conversation = get().conversations.find(
            (c) => c.id === conversationId
          );
          if (conversation && conversation.messages) {
            const seen = new Map<string, ConversationMessage>();
            const uniqueMessages: ConversationMessage[] = [];

            for (const msg of conversation.messages) {
              if (!seen.has(msg.id)) {
                seen.set(msg.id, msg);
                uniqueMessages.push(msg);
              }
            }

            get().saveConversationMessages(conversationId, uniqueMessages);
            get().setMessageCount(conversationId, uniqueMessages.length);
          }
        } else {
          // Purge duplicates from all conversations
          const conversations = get().conversations;
          for (const conversation of conversations) {
            if (conversation.messages && conversation.messages.length > 0) {
              const seen = new Map<string, ConversationMessage>();
              const uniqueMessages: ConversationMessage[] = [];

              for (const msg of conversation.messages) {
                if (!seen.has(msg.id)) {
                  seen.set(msg.id, msg);
                  uniqueMessages.push(msg);
                }
              }

              if (uniqueMessages.length !== conversation.messages.length) {
                get().saveConversationMessages(conversation.id, uniqueMessages);
                get().setMessageCount(conversation.id, uniqueMessages.length);
              }
            }
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
        // Use provided ID or generate new one
        const id = conversation.id || generateConversationId();
        const now = new Date().toISOString();

        const importedConversation: Conversation = {
          ...conversation,
          id,
          createdAt: conversation.createdAt || now,
          updatedAt: conversation.updatedAt || now,
          messageCount: messages.length,
        };

        // Use provided conversationMessages if available, otherwise convert from UIMessages
        const messagesToStore: ConversationMessage[] = conversationMessages
          ? conversationMessages
          : messages.map((msg) => {
              // Extract text content for backward compatibility
              const parts = (msg.parts || []) as Array<{
                type?: string;
                text?: string;
              }>;
              const textParts = parts.filter((p) => p.type === 'text');
              const content =
                textParts
                  .map((p) => p.text)
                  .join(' ')
                  .trim() || '';

              return {
                id: msg.id,
                role: msg.role as 'user' | 'assistant' | 'system',
                content,
                parts: msg.parts as ConversationMessage['parts'],
                createdAt: conversation.createdAt || now,
              };
            });

        set({
          conversations: [...get().conversations, importedConversation],
          currentConversationId: id,
        });

        // Save messages
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
          const now = new Date().toISOString();

          const importedConversation: Conversation = {
            ...conversation,
            id,
            createdAt: conversation.createdAt || now,
            updatedAt: conversation.updatedAt || now,
            messageCount: messages.length,
          };

          // Store messages with parts if available
          const conversationMessages: ConversationMessage[] = messages.map(
            (msg) => {
              const parts = (msg.parts || []) as Array<{
                type?: string;
                text?: string;
              }>;
              const textParts = parts.filter((p) => p.type === 'text');
              const content =
                textParts
                  .map((p) => p.text)
                  .join(' ')
                  .trim() || '';

              return {
                id: msg.id,
                role: msg.role as 'user' | 'assistant' | 'system',
                content,
                parts: msg.parts as ConversationMessage['parts'],
                createdAt: new Date().toISOString(),
              };
            }
          );

          imported.push(importedConversation);
          conversationsWithMessages.push({
            id,
            messages: conversationMessages,
          });
        }

        // Batch update: first add conversations, then add messages
        set({
          conversations: [...existing, ...imported],
        });

        // Then add messages to each conversation (this updates in-memory state only)
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
