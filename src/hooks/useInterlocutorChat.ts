import { createChatTransport } from '@/lib/chat-transport';
import { useProviderStatusStore } from '@/lib/provider-status';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { useEffect, useRef } from 'react';

export interface InterlocutorChatError {
  message: string;
  code?: string;
  suggestion?: string;
  stack?: string;
}

export interface UseInterlocutorChatReturn {
  // Actions
  sendMessage: (options: { text: string }) => void;
  stop: () => void;
  regenerate: () => void;
  // State
  status: 'idle' | 'submitted' | 'streaming' | 'error' | 'ready';
  // Streaming messages from useChat (includes in-progress assistant message)
  streamingMessages: UIMessage[];
}

export const useInterlocutorChat = (
  messages: UIMessage[],
  conversationId?: string,
  onFinish?: (options: {
    message: UIMessage;
    messages: UIMessage[];
    isAbort: boolean;
    isDisconnect: boolean;
    isError: boolean;
  }) => void,
  onError?: (error: InterlocutorChatError) => void
): UseInterlocutorChatReturn => {
  const effectiveConversationId = conversationId || 'default';
  const checkProvider = useProviderStatusStore((state) => state.checkProvider);

  // Cast for ai v5/v6 type resolution mismatch (we use ai v6; some deps still resolve to v5 types).
  const chatResult = useChat({
    messages: messages as never,
    transport: createChatTransport(effectiveConversationId) as never,
    onFinish: onFinish,
    onError: (error) => {
      // Recheck provider status on error
      checkProvider();

      // Parse error message for provider-specific errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if it's a provider unavailable error from our backend
      if (
        errorMessage.includes('503') ||
        errorMessage.includes('PROVIDER_UNAVAILABLE')
      ) {
        onError?.({
          message: 'AI provider is unavailable',
          code: 'PROVIDER_UNAVAILABLE',
          suggestion:
            'Start a local LLM server or configure OPENAI_BASE_URL in server/.env',
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network')
      ) {
        onError?.({
          message: 'Cannot connect to backend server',
          code: 'NETWORK_ERROR',
          suggestion: 'Make sure the backend is running with: bun run dev',
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        onError?.({
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    },
  });

  // Sync useChat's internal messages with external displayMessages when they change
  // This prevents "zombie" messages from reappearing after deletion
  const prevMessageIdsRef = useRef<string>('');
  useEffect(() => {
    // Create a stable key from message IDs to detect external changes
    const currentIds = messages.map((m) => m.id).join(',');
    const chatIds = chatResult.messages.map((m) => m.id).join(',');

    // Only sync if external messages differ from chat's internal state
    // and we're not currently streaming (to avoid interrupting active streams)
    if (
      currentIds !== chatIds &&
      currentIds !== prevMessageIdsRef.current &&
      chatResult.status !== 'streaming' &&
      chatResult.status !== 'submitted'
    ) {
      chatResult.setMessages(messages as never);
    }
    prevMessageIdsRef.current = currentIds;
  }, [messages, chatResult]);

  return {
    sendMessage: chatResult.sendMessage,
    stop: chatResult.stop,
    regenerate: chatResult.regenerate,
    status: chatResult.status,
    // Return streaming messages from useChat for real-time display
    streamingMessages: chatResult.messages as UIMessage[],
  };
};
