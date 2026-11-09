/**
 * terminalTypes.ts — contracts for the terminal (CLI-style) chat layout.
 *
 * Defines the terminal mode union and the prop/summary shapes passed between
 * the terminal view, its command handlers, and the conversation store.
 *
 * @module components/chat/terminal/terminalTypes
 */

/** Distinct interaction modes of the terminal layout. */
export type TerminalMode =
  | 'filesystem'
  | 'conversation-selection'
  | 'conversation-preview'
  | 'conversation-active';

/** Summary of a conversation as listed by the terminal picker. */
export interface TerminalConversationSummary {
  readonly id: string;
  readonly title: string;
  readonly preview?: string;
  readonly updatedAt: string;
  readonly messageCount?: number;
  readonly createdAt?: string;
}

/** Props for the terminal chat renderer. */
export interface TerminalChatProps {
  readonly messages: import('ai').UIMessage[];
  readonly isLoading: boolean;
  readonly isLoadingMessages: boolean;
  readonly onPromptSubmit: (prompt: string) => void;
  readonly conversations: TerminalConversationSummary[];
  readonly onConversationLoad: (conversationId: string) => void;
  readonly onCreateConversation: () => void;
  readonly onExitToChat?: () => void;
}
