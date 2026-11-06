// Chat transport configuration for AI SDK
import type { ChatTransport, UIMessage } from 'ai';
import { DefaultChatTransport } from 'ai';
import { useSettingsStore } from './settings-store';

export const chatApi = '/api/chat';

export class ConversationChatTransport implements ChatTransport<UIMessage> {
  private baseTransport: DefaultChatTransport<UIMessage>;

  constructor(private conversationId?: string) {
    this.baseTransport = new DefaultChatTransport({
      api: chatApi,
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

  async sendMessages(
    options: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]
  ) {
    return this.baseTransport.sendMessages(options);
  }

  async reconnectToStream(
    options: Parameters<ChatTransport<UIMessage>['reconnectToStream']>[0]
  ) {
    return this.baseTransport.reconnectToStream(options);
  }
}

export function createChatTransport(conversationId?: string) {
  return new ConversationChatTransport(conversationId);
}
