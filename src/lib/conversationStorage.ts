/**
 * @file localforage storage adapter with quota handling plus the conversation ID generator.
 * @module lib/conversationStorage.ts
 */
// localforage storage adapter + quota handling (extracted from conversation-store.ts).
import localforage from 'localforage';
import { StateStorage, createJSONStorage } from 'zustand/middleware';
import type { Conversation } from './conversationTypes';
/**
 * Generate a unique conversation id.
 * @returns A time-based id like `conv_<timestamp>_<random>`.
 */
export const generateConversationId = (): string => {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Storage quota management.
 * Maximum number of conversations persisted before cleanup.
 */
export const MAX_CONVERSATIONS = 50;

/**
 * Storage quota management.
 * Maximum number of messages kept per conversation before trimming.
 */
export const MAX_MESSAGES_PER_CONVERSATION = 100;

/**
 * Initialize localforage instance for conversations.
 * IndexedDB-backed store with localStorage/WebSQL fallback.
 */
export const conversationForage = localforage.createInstance({
  name: 'innerview',
  storeName: 'conversations',
  description: 'Conversation storage for Innerview',
});

/**
 * Custom storage adapter for localforage with error handling.
 *
 * Implements Zustand's `StateStorage` interface. On quota exhaustion it
 * prunes old conversations (keeping the 20 most recent, trimmed to 50 messages
 * each) and retries, clearing all data as a last resort.
 */
export const localforageStateStorage: StateStorage = {
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

/**
 * Zustand JSON storage wrapping `localforageStateStorage`.
 *
 * The replacer applies quota limits when storing the `conversations` key:
 * sorted by updatedAt (most recent first), capped at MAX_CONVERSATIONS
 * conversations and MAX_MESSAGES_PER_CONVERSATION messages each.
 */
export const localforageStorage = createJSONStorage(
  () => localforageStateStorage,
  {
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
  }
);
