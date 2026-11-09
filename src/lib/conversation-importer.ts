/**
 * @file Conversation import from DeepSeek and Interlocutor export formats.
 * @module lib/conversation-importer.ts
 */
// Conversation import utility
// Handles importing conversations from DeepSeek format or converted Interlocutor format
import type { Conversation, ConversationMessage } from './conversation-store';
import type {
  DeepSeekConversation,
  InterlocutorConversation,
} from './conversation-import-types';
import { convertDeepSeekConversation } from './deepSeekConverter';
import {
  convertToMessageFormat,
  extractTextFromParts,
} from './conversation-import-utils';
import type { UIMessage } from 'ai';

export type {
  DeepSeekConversation,
  DeepSeekFragment,
  DeepSeekFile,
  DeepSeekMappingNode,
  DeepSeekMessage,
  InterlocutorConversation,
  InterlocutorMessage,
} from './conversation-import-types';

export function importConversation(
  data: DeepSeekConversation | InterlocutorConversation,
  onProgress?: (step: string, current: number, total: number) => void
): {
  conversation: Conversation;
  messages: UIMessage[];
  conversationMessages?: ConversationMessage[];
} {
  let interlocutorConv: InterlocutorConversation;

  // Check if it's DeepSeek format (has mapping) or Interlocutor format (has messages array)
  if ('mapping' in data && data.mapping) {
    // DeepSeek format - convert it
    onProgress?.('Converting DeepSeek format...', 0, 1);
    interlocutorConv = convertDeepSeekConversation(
      data as DeepSeekConversation,
      onProgress
    );
  } else if ('messages' in data && Array.isArray(data.messages)) {
    // Already in Interlocutor format
    onProgress?.('Processing Interlocutor format...', 0, 1);
    interlocutorConv = data as InterlocutorConversation;
  } else {
    throw new Error('Invalid conversation format');
  }

  // Convert to Message format for useChat
  onProgress?.(
    `Converting ${interlocutorConv.messages.length} messages to UI format...`,
    0,
    interlocutorConv.messages.length
  );
  const messages = interlocutorConv.messages.map((msg, index) => {
    const converted = convertToMessageFormat(msg);
    if (
      (index + 1) % 10 === 0 ||
      index === interlocutorConv.messages.length - 1
    ) {
      onProgress?.(
        `Converting messages... (${index + 1}/${interlocutorConv.messages.length})`,
        index + 1,
        interlocutorConv.messages.length
      );
    }
    return converted;
  });

  // Extract preview from first user message
  const firstUserMessage = interlocutorConv.messages.find(
    (m) => m.role === 'user'
  );
  const preview = firstUserMessage
    ? extractTextFromParts(firstUserMessage.parts)
    : undefined;

  // Get conversation dates with fallbacks
  const conversationCreatedAt =
    interlocutorConv.createdAt || new Date().toISOString();
  const conversationUpdatedAt =
    interlocutorConv.updatedAt || conversationCreatedAt;

  // Create conversation object
  const conversation: Conversation = {
    id:
      interlocutorConv.id ||
      `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title: interlocutorConv.title || 'Imported Conversation',
    createdAt: conversationCreatedAt,
    updatedAt: conversationUpdatedAt,
    messageCount: interlocutorConv.messages.length,
    preview: preview?.slice(0, 100),
  };

  // Convert messages to ConversationMessage format with dates
  onProgress?.(
    `Preparing ${interlocutorConv.messages.length} messages for storage...`,
    0,
    interlocutorConv.messages.length
  );
  const conversationMessages = interlocutorConv.messages.map((msg, index) => {
    const textContent = extractTextFromParts(msg.parts);
    if (
      (index + 1) % 10 === 0 ||
      index === interlocutorConv.messages.length - 1
    ) {
      onProgress?.(
        `Preparing messages... (${index + 1}/${interlocutorConv.messages.length})`,
        index + 1,
        interlocutorConv.messages.length
      );
    }
    return {
      id: msg.id,
      role: msg.role,
      content: textContent,
      createdAt: msg.createdAt || conversationCreatedAt,
      parts: msg.parts,
    };
  });

  onProgress?.(
    'Import complete!',
    conversationMessages.length,
    conversationMessages.length
  );
  return { conversation, messages, conversationMessages };
}

// Import multiple conversations
export function importConversations(
  data: (DeepSeekConversation | InterlocutorConversation)[]
): Array<{ conversation: Conversation; messages: UIMessage[] }> {
  return data.map((conv) => importConversation(conv));
}

// Parse JSON file content
export async function parseImportFile(file: File): Promise<
  | { type: 'single'; data: DeepSeekConversation | InterlocutorConversation }
  | {
      type: 'multiple';
      data: (DeepSeekConversation | InterlocutorConversation)[];
    }
> {
  const text = await file.text();
  const json = JSON.parse(text);

  // Check if it's an array (multiple conversations) or single object
  if (Array.isArray(json)) {
    return { type: 'multiple', data: json };
  } else {
    return { type: 'single', data: json };
  }
}
