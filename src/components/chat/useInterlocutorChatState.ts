/**
 * @file useInterlocutorChatState.ts — composed state hook for the chat surface.
 *
 * Aggregates settings, conversation management, chat transport, streaming,
 * text-to-speech, and visualization state into one stable object consumed by
 * `InterlocutorChat`. All hooks are composed (not inherited from) so each
 * concern stays independently testable.
 *
 * @module components/chat/useInterlocutorChatState
 */

import { useConversationManagement } from '@/hooks/useConversationManagement';
import {
  useInterlocutorChat,
  type InterlocutorChatError,
} from '@/hooks/useInterlocutorChat';
import { useStreamingMessages } from '@/hooks/useStreamingMessages';
import { useSystemDataSource } from '@/hooks/useSystemDataSource';
import { useTTS } from '@/hooks/useTTS';
import { useVisualizationSettings } from '@/hooks/useVisualizationSettings';
import { useConversationStore } from '@/lib/conversation-store';
import { useSettingsStore } from '@/lib/settings-store';
import { extractMessageText } from '@/utils/message-conversion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { TokenUsage } from './InterlocutorChatTypes';

/** Default context window assumed for the usage meter (tokens). */
export const MAX_CONTEXT_TOKENS = 128_000;

/** Approximate characters per token used when estimating usage. */
const CHARS_PER_TOKEN = 4;

const useInterlocutorChatStateImpl = () => {
  // ============================================================================
  // SETTINGS & CONFIGURATION
  // ============================================================================
  const reasoningTag = useSettingsStore(
    (state) => state.settings?.generation?.reasoningTag || 'thinking'
  );
  const streamingEnabled = useSettingsStore(
    (state) => state.settings?.generation?.streamingEnabled !== false
  );
  const storedLayoutMode = useSettingsStore(
    (state) => state.settings?.style?.mode || 'condensed'
  );
  const layoutMode =
    typeof window !== 'undefined'
      ? (() => {
          const m = new URLSearchParams(window.location.search).get(
            'layoutMode'
          );
          return m === 'terminal' || m === 'corpo' || m === 'condensed'
            ? m
            : storedLayoutMode;
        })()
      : storedLayoutMode;
  const sidebarBackgroundColor = useSettingsStore(
    (state) => state.settings?.style?.sidebarBackgroundColor || 'transparent'
  );
  const sidebarHeaderBackgroundColor = useSettingsStore(
    (state) =>
      state.settings?.style?.sidebarHeaderBackgroundColor || 'transparent'
  );
  const promptInputBackgroundColor = useSettingsStore(
    (state) =>
      state.settings?.style?.promptInputBackgroundColor || 'transparent'
  );
  const performanceSettings = useSettingsStore(
    useShallow((state) => state.settings?.performance ?? null)
  );
  const getKeyboardSettings = useSettingsStore(
    (state) => state.getKeyboardSettings
  );
  const getTranscriptionSettings = useSettingsStore(
    (state) => state.getTranscriptionSettings
  );
  const updateStyleSettings = useSettingsStore(
    (state) => state.updateStyleSettings
  );

  // ============================================================================
  // CONVERSATION MANAGEMENT
  // ============================================================================
  const {
    effectiveConversationId,
    conversations,
    displayMessages,
    handleChatFinish,
    createSubmitHandler,
    createConversation,
    loadConversationMessages,
  } = useConversationManagement(reasoningTag, layoutMode);

  const purgeDuplicateMessages = useConversationStore(
    (state) => state.purgeDuplicateMessages
  );
  const clearAllConversations = useConversationStore(
    (state) => state.clearAllConversations
  );
  const removeConversationMessage = useConversationStore(
    (state) => state.removeConversationMessage
  );

  // ============================================================================
  // CHAT HOOK & MESSAGE HANDLING
  // ============================================================================
  const [chatError, setChatError] = useState<InterlocutorChatError | null>(
    null
  );

  const handleChatError = useCallback((error: InterlocutorChatError): void => {
    setChatError(error);
  }, []);

  const handleDeleteMessage = useCallback(
    (messageId: string): void => {
      if (effectiveConversationId) {
        removeConversationMessage(effectiveConversationId, messageId);
      }
    },
    [effectiveConversationId, removeConversationMessage]
  );

  const { sendMessage, status, stop, regenerate, streamingMessages } =
    useInterlocutorChat(
      displayMessages,
      effectiveConversationId,
      handleChatFinish,
      handleChatError
    );

  const handleSubmitMessage = createSubmitHandler(sendMessage);
  const isLoading = status === 'submitted' || status === 'streaming';
  const canStop = isLoading;
  const canRegenerate =
    !isLoading &&
    displayMessages.length > 0 &&
    displayMessages[displayMessages.length - 1]?.role === 'assistant';

  // Use streaming messages during streaming when enabled, otherwise use stored messages
  // When streaming is disabled, always use stored messages (user won't see partial responses)
  const messagesForDisplay =
    streamingEnabled && isLoading ? streamingMessages : displayMessages;

  // Process messages through streaming parser for reasoning tag detection
  const processedMessages = useStreamingMessages({
    messages: messagesForDisplay,
    reasoningTag,
    streamingEnabled,
    isLoading,
  });

  // ============================================================================
  // UI STATE
  // ============================================================================
  const [input, setInput] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showConversationList, setShowConversationList] = useState(false);
  const [showPerformanceSettings, setShowPerformanceSettings] = useState(false);
  const [corpoDrawerOpen, setCorpoDrawerOpen] = useState(false);
  const [backgroundControlsOpen, setBackgroundControlsOpen] = useState(false);

  // ============================================================================
  // TTS MANAGEMENT
  // ============================================================================
  const {
    isTTSSpeaking,
    isUsingKokoro,
    isPlayingMP3,
    analyserNode,
    audioElement,
    stopTTS,
  } = useTTS({
    enabled: ttsEnabled,
    // Use processedMessages for TTS to include streaming content
    messages: processedMessages,
    isLoading,
  });

  // ============================================================================
  // VISUALIZATION SETTINGS
  // ============================================================================
  const {
    waveformLayers,
    waveformSettings,
    waveformEnabled,
    backgroundSettings,
    setWaveformLayers,
    setWaveformSettings,
    setLocalWaveformSettings,
    setWaveformEnabled,
    setBackgroundSettings,
  } = useVisualizationSettings();

  // Token usage for context visualization (and later for ContextCounter)
  const tokenUsage: TokenUsage = React.useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    processedMessages.forEach((msg) => {
      const text = extractMessageText(msg);
      const estimatedTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
      if (msg.role === 'user') inputTokens += estimatedTokens;
      else if (msg.role === 'assistant') outputTokens += estimatedTokens;
    });
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }, [processedMessages]);

  const maxContextTokens = MAX_CONTEXT_TOKENS;
  const usedTokens = tokenUsage.totalTokens;

  // ============================================================================
  // SYSTEM DATA SOURCE & VISUALIZATION
  // ============================================================================
  const isIdle = !isTTSSpeaking && !isPlayingMP3 && !isLoading;
  const contextUsage = React.useMemo(
    () => ({ used: usedTokens, max: maxContextTokens }),
    [usedTokens, maxContextTokens]
  );
  const cycleDurationMs =
    backgroundSettings?.systemVisualizationCycleDurationMs ?? 20000;
  const systemDataSource = useSystemDataSource(
    isIdle,
    cycleDurationMs,
    backgroundSettings?.systemVisualizationSourceId ?? undefined,
    backgroundSettings?.cycleSystemVisualizations !== false,
    contextUsage
  );
  const { navigateToVisualizationType, visualizationType } = systemDataSource;

  // Use a ref to track the current visualization type to avoid re-registering hotkeys
  const visualizationTypeRef = useRef(visualizationType);
  useEffect(() => {
    visualizationTypeRef.current = visualizationType;
  }, [visualizationType]);

  return {
    reasoningTag,
    streamingEnabled,
    layoutMode,
    sidebarBackgroundColor,
    sidebarHeaderBackgroundColor,
    promptInputBackgroundColor,
    performanceSettings,
    getKeyboardSettings,
    getTranscriptionSettings,
    updateStyleSettings,
    effectiveConversationId,
    conversations,
    displayMessages,
    handleChatFinish,
    createSubmitHandler,
    createConversation,
    loadConversationMessages,
    purgeDuplicateMessages,
    clearAllConversations,
    removeConversationMessage,
    chatError,
    setChatError,
    handleChatError,
    handleDeleteMessage,
    sendMessage,
    status,
    stop,
    regenerate,
    streamingMessages,
    handleSubmitMessage,
    isLoading,
    canStop,
    canRegenerate,
    messagesForDisplay,
    processedMessages,
    input,
    setInput,
    ttsEnabled,
    setTtsEnabled,
    sidebarVisible,
    setSidebarVisible,
    showConversationList,
    setShowConversationList,
    showPerformanceSettings,
    setShowPerformanceSettings,
    corpoDrawerOpen,
    setCorpoDrawerOpen,
    backgroundControlsOpen,
    setBackgroundControlsOpen,
    isTTSSpeaking,
    isUsingKokoro,
    isPlayingMP3,
    analyserNode,
    audioElement,
    stopTTS,
    waveformLayers,
    waveformSettings,
    waveformEnabled,
    backgroundSettings,
    setWaveformLayers,
    setWaveformSettings,
    setLocalWaveformSettings,
    setWaveformEnabled,
    setBackgroundSettings,
    tokenUsage,
    maxContextTokens,
    usedTokens,
    isIdle,
    systemDataSource,
    navigateToVisualizationType,
    visualizationTypeRef,
  };
};

/** Composed chat state returned by {@link useInterlocutorChatState}. */
export type InterlocutorChatState = ReturnType<
  typeof useInterlocutorChatStateImpl
>;

/**
 * Composes all chat-surface state (settings, conversation, transport,
 * streaming, TTS, visualization) into a single object for `InterlocutorChat`.
 *
 * @returns Flat chat state consumed by the layout views.
 */
export const useInterlocutorChatState = (): InterlocutorChatState =>
  useInterlocutorChatStateImpl();
