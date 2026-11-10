/**
 * @file Conversation domain types shared across the store, storage, and import/export modules.
 * @module lib/conversationTypes.ts
 */
// Conversation domain types (extracted from conversation-store.ts).

/**
 * A single stored conversation message.
 *
 * May include rich `parts` for imported conversations (citations, tool
 * calls, web search results, file attachments).
 */
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

/**
 * A stored conversation, with optional messages and preview.
 */
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string;
  messages?: ConversationMessage[];
}

/**
 * Zustand conversation store shape.
 *
 * Combines conversation CRUD, message storage, import actions, legacy
 * compatibility methods, and dev-mode triage functions.
 */
export interface ConversationStore {
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
