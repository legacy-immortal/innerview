/**
 * InterlocutorChatTypes.ts — shared contracts for the Innerview chat surface.
 *
 * Centralises the prop and state shapes that flow between `InterlocutorChat`
 * and its three layout modes (standard, corpo, terminal) so every view can
 * depend on one stable, enterprise-grade contract.
 *
 * @module components/chat/InterlocutorChatTypes
 */

import type { ParsedStreamingMessage } from '@/hooks/useStreamingMessages';
import type { InterlocutorChatError } from '@/hooks/useInterlocutorChat';
import type { useSystemDataSource } from '@/hooks/useSystemDataSource';
import { useVirtualizer } from '@tanstack/react-virtual';
import type {
  WaveformLayer,
  WaveformSettings,
} from '@/components/background/BackgroundControlPanel';
import type { BackgroundSettings } from '@/lib/settings-types';
import type { Conversation, ConversationStore } from '@/lib/conversationTypes';
import type { ConversationListRef } from './condensed/ConversationList';

/** Immutable system-data source driving the background visualizations. */
export type SystemDataSource = ReturnType<typeof useSystemDataSource>;

/** Subset of the conversation store used by the chat views. */
export type StoreFunctions = Pick<
  ConversationStore,
  | 'loadConversationMessages'
  | 'purgeDuplicateMessages'
  | 'clearAllConversations'
>;

/** Background/visualization props shared by every layout mode. */
export interface ChatBackgroundProps {
  readonly backgroundSettings: BackgroundSettings;
  readonly waveformEnabled: boolean;
  readonly isTTSSpeaking: boolean;
  readonly isPlayingMP3: boolean;
  readonly audioElement: HTMLAudioElement | null;
  readonly isUsingKokoro: boolean;
  readonly analyserNode: AnalyserNode | null;
  readonly isIdle: boolean;
  readonly waveformLayers: WaveformLayer[];
  readonly waveformSettings: WaveformSettings;
  readonly systemDataSource: SystemDataSource;
  readonly shouldShowControlPanel: () => boolean;
  readonly backgroundControlsOpen: boolean;
  readonly onBackgroundControlsToggle: (open: boolean) => void;
  readonly onBackgroundSettingsChange: (settings: BackgroundSettings) => void;
  readonly onWaveformLayersChange: (layers: WaveformLayer[]) => void;
  readonly onWaveformSettingsChange: (settings: WaveformSettings) => void;
  readonly onLocalWaveformSettingsChange: (settings: WaveformSettings) => void;
  readonly onWaveformEnabledChange: (enabled: boolean) => void;
}

/** Estimated token usage for the current conversation. */
export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

/** Voice-transcription state surfaced to the input area. */
export interface TranscriptionState {
  readonly isRecording: boolean;
  readonly isTranscribing: boolean;
  readonly audioLevel: number;
  readonly error: Error | null;
}

/** Props for the terminal (CLI-style) layout. */
export type TerminalModeViewProps = ChatBackgroundProps & {
  readonly processedMessages: ParsedStreamingMessage[];
  readonly isLoading: boolean;
  readonly isLoadingMessages: boolean;
  readonly onPromptSubmit: (text: string) => void;
  readonly conversations: Conversation[];
  readonly onCreateConversation: () => void;
  readonly onExitToChat: () => void;
  readonly onConversationLoad: (conversationId: string) => void;
};

/** Props for the standard (two-pane) layout. */
export type StandardModeViewProps = ChatBackgroundProps &
  StoreFunctions & {
    readonly sidebarVisible: boolean;
    readonly onSidebarVisibleChange: (visible: boolean) => void;
    readonly sidebarBackgroundColor: string;
    readonly sidebarHeaderBackgroundColor: string;
    readonly promptInputBackgroundColor: string;
    readonly showConversationList: boolean;
    readonly onToggleConversationList: () => void;
    readonly onCreateConversation: () => string;
    readonly canStop: boolean;
    readonly onStop: () => void;
    readonly canRegenerate: boolean;
    readonly onRegenerate: () => void;
    readonly ttsEnabled: boolean;
    readonly onTtsToggle: () => void;
    readonly onStopAudio: () => void;
    readonly onShowPerformanceSettings: () => void;
    readonly effectiveConversationId: string;
    readonly conversations: Conversation[];
    readonly conversationListRef: { current: ConversationListRef | null };
    readonly onConversationSelect: () => void;
    readonly chatError: InterlocutorChatError | null;
    readonly onCloseError: () => void;
    readonly messagesContainerRef: { current: HTMLDivElement | null };
    readonly messagesParentRef: { current: HTMLDivElement | null };
    readonly virtualizer: ReturnType<
      typeof useVirtualizer<HTMLDivElement, Element>
    >;
    readonly processedMessages: ParsedStreamingMessage[];
    readonly isLoading: boolean;
    readonly isLoadingMessages: boolean;
    readonly onDeleteMessage: (messageId: string) => void;
    readonly input: string;
    readonly onInputChange: (value: string) => void;
    readonly onSubmit: (text: string) => void;
    readonly usedTokens: number;
    readonly maxContextTokens: number;
    readonly tokenUsage: TokenUsage;
    readonly onTranscriptionComplete: (text: string) => void;
    readonly onTranscriptionStart: () => void;
    readonly onTranscriptionStop: () => void;
    readonly disableTranscription: boolean;
    readonly transcription: TranscriptionState;
    readonly showPerformanceSettings: boolean;
    readonly onClosePerformanceSettings: () => void;
  };

/** Props for the corpo (drawer-based) layout. */
export type CorpoModeViewProps = {
  readonly background: ChatBackgroundProps;
} & StoreFunctions & {
    readonly drawerOpen: boolean;
    readonly onDrawerOpenChange: (open: boolean) => void;
    readonly processedMessages: ParsedStreamingMessage[];
    readonly isLoading: boolean;
    readonly isLoadingMessages: boolean;
    readonly messagesContainerRef: { current: HTMLDivElement | null };
    readonly messagesParentRef: { current: HTMLDivElement | null };
    readonly virtualizer: ReturnType<
      typeof useVirtualizer<HTMLDivElement, Element>
    >;
    readonly input: string;
    readonly onInputChange: (value: string) => void;
    readonly onSubmit: (text: string) => void;
    readonly promptInputBackgroundColor: string;
    readonly sidebarBackgroundColor: string;
    readonly usedTokens: number;
    readonly maxContextTokens: number;
    readonly tokenUsage: TokenUsage;
    readonly onTranscriptionComplete: (text: string) => void;
    readonly onTranscriptionStart: () => void;
    readonly onTranscriptionStop: () => void;
    readonly disableTranscription: boolean;
    readonly transcription: TranscriptionState;
    readonly conversationListRef: { current: ConversationListRef | null };
    readonly onConversationSelect: () => void;
    readonly createConversation: () => void;
    readonly onShowPerformanceSettings: () => void;
    readonly onDeleteMessage: (messageId: string) => void;
    readonly chatError: InterlocutorChatError | null;
    readonly onCloseError: () => void;
    readonly ttsEnabled: boolean;
    readonly onTtsToggle: () => void;
    readonly isTTSSpeaking: boolean;
    readonly onStopAudio: () => void;
    readonly effectiveConversationId: string;
    readonly conversations: Conversation[];
    readonly showPerformanceSettings: boolean;
    readonly onClosePerformanceSettings: () => void;
  };
