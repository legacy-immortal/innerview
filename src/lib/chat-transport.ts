/**
 * @file AI SDK chat transport that injects generation settings into each request.
 * @module lib/chat-transport.ts
 */
// Chat transport configuration for AI SDK
import type { ChatTransport, UIMessage } from 'ai';
import { DefaultChatTransport } from 'ai';
import { useSettingsStore } from './settings-store';

/** Chat API endpoint for streamed conversation requests. */
export const CHAT_API = '/api/chat';

/** @deprecated Use {@link CHAT_API} instead. @alias CHAT_API */
export const chatApi = CHAT_API;

/**
 * Chat transport that injects the current generation settings into every
 * request body, delegating streaming to the AI SDK default transport.
 */
export class ConversationChatTransport implements ChatTransport<UIMessage> {
  private readonly baseTransport: DefaultChatTransport<UIMessage>;
  private readonly conversationId: string | undefined;

  public constructor(conversationId?: string) {
    this.conversationId = conversationId;
    this.baseTransport = new DefaultChatTransport({
      api: CHAT_API,
      body: () => {
        return {
          conversationId: this.conversationId,
          generationSettings: useSettingsStore
            .getState()
            .getGenerationSettings(),
        };
      },
    });
  }

  public async sendMessages(
    options: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]
  ): ReturnType<ChatTransport<UIMessage>['sendMessages']> {
    return this.baseTransport.sendMessages(options);
  }

  public async reconnectToStream(
    options: Parameters<ChatTransport<UIMessage>['reconnectToStream']>[0]
  ): ReturnType<ChatTransport<UIMessage>['reconnectToStream']> {
    return this.baseTransport.reconnectToStream(options);
  }
}

/**
 * Creates a chat transport bound to a conversation.
 * @param conversationId - Optional conversation identifier sent with requests.
 * @returns The chat transport instance.
 */
export function createChatTransport(
  conversationId?: string
): ConversationChatTransport {
  return new ConversationChatTransport(conversationId);
}
