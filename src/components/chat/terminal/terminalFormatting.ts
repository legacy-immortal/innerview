/**
 * terminalFormatting.ts — text formatting helpers for the terminal layout.
 *
 * Renders conversations as plain-text lists/trees and formats dates for the
 * CLI-style picker. All formatters are pure with explicit return types.
 *
 * @module components/chat/terminal/terminalFormatting
 */

import { useCallback } from 'react';
import type { TerminalConversationSummary } from './terminalTypes';

/**
 * Formats an ISO date for terminal display (`MMM D HH:MM`).
 *
 * @param dateString ISO date to format.
 * @returns Human-readable terminal date.
 */
export const formatTerminalDate = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day} ${hours}:${minutes}`;
};

/**
 * Formats conversations as a numbered plain-text list.
 *
 * @param sortedConversations Conversations in display order.
 * @returns Multi-line list, or `No conversations found.` when empty.
 */
export const formatConversationsList = (
  sortedConversations: readonly TerminalConversationSummary[]
): string => {
  if (sortedConversations.length === 0) {
    return 'No conversations found.';
  }

  return sortedConversations
    .map((conv, idx) => {
      const num = idx + 1;
      const title = conv.title || 'Untitled Conversation';
      const msgCount = conv.messageCount || 0;
      const updated = formatTerminalDate(conv.updatedAt);
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      return `[${num}] ${filename.padEnd(40)} ${msgCount.toString().padStart(3)} msgs  ${updated}`;
    })
    .join('\n');
};

/**
 * Formats conversations as a filesystem-style tree (`conversations/ …`).
 *
 * @param sortedConversations Conversations in display order.
 * @returns Multi-line tree, or `No conversations found.` when empty.
 */
export const formatConversationsTree = (
  sortedConversations: readonly TerminalConversationSummary[]
): string => {
  if (sortedConversations.length === 0) {
    return 'No conversations found.';
  }

  const lines = ['conversations/'];
  sortedConversations.forEach((conv, idx) => {
    const num = idx + 1;
    const title = conv.title || 'Untitled Conversation';
    const msgCount = conv.messageCount || 0;
    const updated = formatTerminalDate(conv.updatedAt);
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    const isLast = idx === sortedConversations.length - 1;
    const prefix = isLast ? '└──' : '├──';
    lines.push(`${prefix} [${num}] ${filename} (${msgCount} msgs, ${updated})`);
  });

  return lines.join('\n');
};

/** Callbacks returned by {@link useTerminalFormatting}. */
export interface UseTerminalFormattingReturn {
  readonly formatConversationsListCallback: () => string;
  readonly formatConversationsTreeCallback: () => string;
}

/**
 * Memoised list/tree formatters bound to the sorted conversation set.
 *
 * @param sortedConversations Conversations in display order.
 * @returns Stable formatter callbacks.
 */
export const useTerminalFormatting = (
  sortedConversations: readonly TerminalConversationSummary[]
): UseTerminalFormattingReturn => {
  const formatConversationsListCallback = useCallback(
    () => formatConversationsList(sortedConversations),
    [sortedConversations]
  );

  const formatConversationsTreeCallback = useCallback(
    () => formatConversationsTree(sortedConversations),
    [sortedConversations]
  );

  return { formatConversationsListCallback, formatConversationsTreeCallback };
};
