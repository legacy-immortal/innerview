/**
 * @file useInterlocutorChatScrolling.ts — Scrolling/virtualisation refs for the message stream.
 *
 * @module components/chat/useInterlocutorChatScrolling
 */

import type { ParsedStreamingMessage } from '@/hooks/useStreamingMessages';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ConversationListRef } from './condensed/ConversationList';

/** Options for {@link useInterlocutorChatScrolling}. */
export interface UseInterlocutorChatScrollingOptions {
  /** Messages currently rendered in the stream. */
  readonly processedMessages: ParsedStreamingMessage[];
  /** Whether the conversation list overlay is visible. */
  readonly showConversationList: boolean;
  /** Whether the chat transport is currently loading. */
  readonly isLoading: boolean;
}

/** Return value of {@link useInterlocutorChatScrolling}. */
export interface UseInterlocutorChatScrollingResult {
  readonly conversationListRef: RefObject<ConversationListRef | null>;
  readonly messagesContainerRef: RefObject<HTMLDivElement | null>;
  readonly messagesParentRef: RefObject<HTMLDivElement | null>;
  readonly virtualizer: ReturnType<
    typeof useVirtualizer<HTMLDivElement, Element>
  >;
  readonly isLoadingMessages: boolean;
  readonly setIsLoadingMessages: Dispatch<SetStateAction<boolean>>;
}

/**
 * Provides refs, virtualisation, and auto-scroll behavior for the message stream.
 *
 * @param options - Scrolling hook options.
 * @returns Refs and state for the message list UI.
 */
export const useInterlocutorChatScrolling = ({
  processedMessages,
  showConversationList,
  isLoading,
}: UseInterlocutorChatScrollingOptions): UseInterlocutorChatScrollingResult => {
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const conversationListRef = useRef<ConversationListRef | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesParentRef = useRef<HTMLDivElement>(null);
  const prevShowConversationListRef = useRef<boolean>(false);

  // ============================================================================
  // MESSAGE SCROLLING & VIRTUALIZATION
  // ============================================================================
  const virtualizer = useVirtualizer({
    count: processedMessages.length,
    getScrollElement: () => messagesContainerRef.current,
    // 150px is the estimated average message height; tanstack-virtual uses this
    // to lay out off-screen items before they are measured.
    estimateSize: () => 150,
    // Overscan 5 rows above/below the viewport so scrolling never reveals
    // unmeasured empty space.
    overscan: 5,
    horizontal: false,
    getItemKey: (index) =>
      processedMessages[index]?.id ?? `msg-fallback-${index}`,
  });

  const prevMessageCountRef = useRef(processedMessages.length);
  const shouldAutoScrollRef = useRef(true);

  // Auto-scroll to bottom when new messages arrive or content updates during streaming
  useEffect(() => {
    if (
      !showConversationList &&
      processedMessages.length > 0 &&
      messagesContainerRef.current
    ) {
      const isNewMessage =
        processedMessages.length > prevMessageCountRef.current;
      const isInitialLoad = prevMessageCountRef.current === 0;

      if (
        (isNewMessage || isInitialLoad || isLoading) &&
        shouldAutoScrollRef.current
      ) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
              const scrollElement = messagesContainerRef.current;
              scrollElement.scrollTop = scrollElement.scrollHeight;
            }
          });
        });
      }

      prevMessageCountRef.current = processedMessages.length;
    }
  }, [processedMessages.length, showConversationList, isLoading]);

  // Track user scroll to prevent auto-scroll when user scrolls up
  useEffect(() => {
    const scrollElement = messagesContainerRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      // Consider the user "at the bottom" within 100px so minor scrollbar
      // thumb position doesn't suppress auto-scroll.
      shouldAutoScrollRef.current =
        scrollHeight - scrollTop - clientHeight < 100;
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll when switching from conversation list to messages view
  useEffect(() => {
    if (
      !showConversationList &&
      processedMessages.length > 0 &&
      messagesContainerRef.current
    ) {
      const timeoutId = setTimeout(() => {
        if (messagesContainerRef.current) {
          const scrollElement = messagesContainerRef.current;
          scrollElement.scrollTop = scrollElement.scrollHeight;
          shouldAutoScrollRef.current = true;
        }
      }, 150); // 150ms lets the DOM settle after the view switch before scrolling

      return () => clearTimeout(timeoutId);
    }
  }, [showConversationList, processedMessages.length]);

  // Initialize scroll position to bottom on mount
  useEffect(() => {
    if (
      !showConversationList &&
      processedMessages.length > 0 &&
      messagesContainerRef.current
    ) {
      const scrollElement = messagesContainerRef.current;
      requestAnimationFrame(() => {
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // UI EFFECTS
  // ============================================================================
  // Show loader when switching to messages view
  useEffect(() => {
    if (prevShowConversationListRef.current && !showConversationList) {
      setIsLoadingMessages(true);
      const timeoutId = setTimeout(() => {
        setIsLoadingMessages(false);
      }, 800); // 800ms loader flash so the transition is visible but brief
      return () => clearTimeout(timeoutId);
    }
    prevShowConversationListRef.current = showConversationList;
  }, [showConversationList]);

  return {
    conversationListRef,
    messagesContainerRef,
    messagesParentRef,
    virtualizer,
    isLoadingMessages,
    setIsLoadingMessages,
  };
};
