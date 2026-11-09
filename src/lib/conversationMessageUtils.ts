/**
 * @file Pure helpers for conversation messages: deduplication, UI message conversion, and import builders.
 * @module lib/conversationMessageUtils.ts
 */
/**
 * Pure helpers for conversation messages (extracted from conversation-store.ts).
 *
 * @module lib/conversationMessageUtils
 */
import type { Conversation, ConversationMessage } from './conversationTypes';

/**
 * Deduplicates messages by id, preserving the first occurrence.
 * @param messages - Messages to deduplicate.
 * @returns A new array with duplicate ids removed.
 */
export function dedupeMessages<T extends { readonly id: string }>(
  messages: readonly T[]
): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const msg of messages) {
    if (!seen.has(msg.id)) {
      seen.add(msg.id);
      unique.push(msg);
    }
  }
  return unique;
}

/** Minimal UI message shape consumed by {@link uiMessageToConversationMessage}. */
export interface UIMessageLike {
  readonly id: string;
  readonly role: string;
  readonly parts?: unknown[];
}

/**
 * Converts a UI message (AI SDK shape) into a stored conversation message,
 * keeping only the text content.
 * @param msg - The source UI message.
 * @param createdAt - ISO timestamp for the stored message.
 * @returns The converted conversation message.
 */
export function uiMessageToConversationMessage(
  msg: UIMessageLike,
  createdAt: string
): ConversationMessage {
  const parts = (msg.parts || []) as Array<{ type?: string; text?: string }>;
  const content =
    parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join(' ')
      .trim() || '';
  return {
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    content,
    parts: msg.parts as ConversationMessage['parts'],
    createdAt,
  };
}

export function buildImportedConversation(
  conversation: Conversation,
  messageCount: number,
  fallbackId: string
): Conversation {
  const now = new Date().toISOString();
  return {
    ...conversation,
    id: conversation.id || fallbackId,
    createdAt: conversation.createdAt || now,
    updatedAt: conversation.updatedAt || now,
    messageCount,
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}
