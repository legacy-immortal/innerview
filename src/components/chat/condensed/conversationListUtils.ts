/**
 * @file conversationListUtils.ts — pure helpers for the conversation list.
 *
 * Extracts message text, formats relative dates, yields to the browser to
 * keep the UI responsive, and detects duplicate messages across
 * conversations. Every helper is pure and carries an explicit return type.
 *
 * @module components/chat/condensed/conversationListUtils
 */

import type { ConversationMessage } from '@/lib/conversation-store';
import type { UIMessage } from 'ai';

/** Millisecond constants for relative-date formatting. */
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Extracts plain text from a stored conversation message.
 *
 * @param message The message to read.
 * @returns Lower-cased text content (may be empty).
 */
export const extractMessageText = (message: ConversationMessage): string => {
  let text = message.content || '';
  if (message.parts) {
    const textParts = message.parts
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text)
      .join(' ');
    if (textParts) {
      text += ' ' + textParts;
    }
  }
  return text.toLowerCase();
};

/**
 * Formats an ISO date string as a short relative label.
 *
 * @param dateString ISO date to format.
 * @returns `Just now`, `Xm ago`, `Xh ago`, `Xd ago`, or a local date.
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Yields control to the browser so long list work stays responsive.
 *
 * @returns Promise resolving on the next macrotask.
 */
export const yieldToBrowser = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

/** Minimal conversation identity used by the duplicate-detection helpers. */
export interface ConversationLike {
  readonly id: string;
}

/**
 * Collects every message id across the given conversations.
 *
 * @param conversations Conversations to scan.
 * @param loadConversationMessages Loader returning messages for an id.
 * @returns Set of all known message ids.
 */
export const getAllMessageIds = (
  conversations: readonly ConversationLike[],
  loadConversationMessages: (
    id: string
  ) => ConversationMessage[] | null | undefined
): Set<string> => {
  const allIds = new Set<string>();
  conversations.forEach((conv) => {
    const messages = loadConversationMessages(conv.id);
    messages?.forEach((msg) => {
      if (msg.id) {
        allIds.add(msg.id);
      }
    });
  });
  return allIds;
};

/** Result of {@link checkForDuplicates}. */
export interface DuplicateCheckResult {
  readonly hasDuplicates: boolean;
  readonly count: number;
  readonly duplicateMap: Map<
    string,
    { conversationId: string; message: UIMessage }
  >;
}

/**
 * Finds which `incomingMessages` already exist in stored conversations.
 *
 * @param conversations Stored conversations to compare against.
 * @param loadConversationMessages Loader returning messages for an id.
 * @param incomingMessages Messages to check for collisions.
 * @returns Duplicate summary with a map from message id to owner conversation.
 */
export const checkForDuplicates = (
  conversations: readonly ConversationLike[],
  loadConversationMessages: (
    id: string
  ) => ConversationMessage[] | null | undefined,
  incomingMessages: readonly UIMessage[]
): DuplicateCheckResult => {
  const existingIds = getAllMessageIds(conversations, loadConversationMessages);
  const duplicateMap = new Map<
    string,
    { conversationId: string; message: UIMessage }
  >();

  // Find which conversations contain each duplicate message ID
  incomingMessages.forEach((incomingMsg) => {
    if (existingIds.has(incomingMsg.id)) {
      // Find which conversation contains this message ID
      for (const conv of conversations) {
        const messages = loadConversationMessages(conv.id);
        const existingMsg = messages?.find((m) => m.id === incomingMsg.id);
        if (existingMsg) {
          duplicateMap.set(incomingMsg.id, {
            conversationId: conv.id,
            message: incomingMsg,
          });
          break;
        }
      }
    }
  });

  return {
    hasDuplicates: duplicateMap.size > 0,
    count: duplicateMap.size,
    duplicateMap,
  };
};
