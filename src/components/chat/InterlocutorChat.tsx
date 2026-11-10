/**
 * @file InterlocutorChat.tsx — root component for the Innerview chat surface.
 *
 * Composes state, keyboard, and scrolling hooks, then renders the active
 * layout (`TerminalModeView`, `CorpoModeView`, or `StandardModeView`)
 * based on the current style mode.
 *
 * @module components/chat/InterlocutorChat
 */

import { useConversationStore } from '@/lib/conversation-store';
import { useCallback, useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { CorpoModeView } from './CorpoModeView';
import { StandardModeView } from './StandardModeView';
import { TerminalModeView } from './TerminalModeView';
import { useInterlocutorChatKeyboard } from './useInterlocutorChatKeyboard';
import { useInterlocutorChatScrolling } from './useInterlocutorChatScrolling';
import { useInterlocutorChatState } from './useInterlocutorChatState';

/**
 * Root chat component; delegates to the active layout mode view.
 *
 * @returns The active layout view.
 * @see {@link useInterlocutorChatState} for composed state.
 * @see {@link useInterlocutorChatKeyboard} for keyboard shortcuts.
 * @see {@link useInterlocutorChatScrolling} for refs and virtualisation.
 */
export const InterlocutorChat = (): JSX.Element => {
  const {
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
    createConversation,
    loadConversationMessages,
    purgeDuplicateMessages,
    clearAllConversations,
    chatError,
    setChatError,
    handleDeleteMessage,
    stop,
    regenerate,
    handleSubmitMessage,
    isLoading,
    canStop,
    canRegenerate,
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
  } = useInterlocutorChatState();

  const { keyboardEnabled, exitTerminalKey, transcription } =
    useInterlocutorChatKeyboard({
      input,
      setInput,
      handleSubmitMessage,
      isLoading,
      showPerformanceSettings,
      waveformEnabled,
      navigateToVisualizationType,
      visualizationTypeRef,
      getKeyboardSettings,
      getTranscriptionSettings,
    });

  const {
    conversationListRef,
    messagesContainerRef,
    messagesParentRef,
    virtualizer,
    isLoadingMessages,
  } = useInterlocutorChatScrolling({
    processedMessages,
    showConversationList,
    isLoading,
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleConversationSelect = useCallback(() => {
    setShowConversationList(false);
  }, [setShowConversationList]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  /**
   * Whether the background control panel should be visible.
   *
   * @returns `true` unless the background complexity is minimal.
   */
  const shouldShowControlPanel = useCallback((): boolean => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (
        p.has('showControlPanel') ||
        localStorage.getItem('innerview.showControlPanel') === 'true'
      ) {
        return true;
      }
    }
    return (
      (performanceSettings?.maxBackgroundComplexity ?? 'minimal') !== 'minimal'
    );
  }, [performanceSettings?.maxBackgroundComplexity]);

  // ============================================================================
  // TERMINAL MODE - Clear current conversation on entry / exit to chat
  // ============================================================================
  const exitTerminalToChat = useCallback(() => {
    updateStyleSettings({ mode: 'condensed' });
  }, [updateStyleSettings]);

  useHotkeys(
    exitTerminalKey,
    (e) => {
      e.preventDefault();
      exitTerminalToChat();
    },
    {
      enabled:
        layoutMode === 'terminal' &&
        keyboardEnabled &&
        !showPerformanceSettings,
    },
    [
      exitTerminalKey,
      keyboardEnabled,
      layoutMode,
      showPerformanceSettings,
      exitTerminalToChat,
    ]
  );

  // Clear current conversation when entering terminal mode so it starts in command mode
  useEffect(() => {
    if (layoutMode === 'terminal') {
      const setCurrentConversation =
        useConversationStore.getState().setCurrentConversation;
      setCurrentConversation('');
    }
  }, [layoutMode]);

  const backgroundProps = useMemo(
    () => ({
      backgroundSettings,
      waveformEnabled,
      isTTSSpeaking,
      isPlayingMP3,
      audioElement,
      isUsingKokoro,
      analyserNode,
      isIdle,
      waveformLayers,
      waveformSettings,
      systemDataSource,
      shouldShowControlPanel,
      backgroundControlsOpen,
      onBackgroundControlsToggle: setBackgroundControlsOpen,
      onBackgroundSettingsChange: setBackgroundSettings,
      onWaveformLayersChange: setWaveformLayers,
      onWaveformSettingsChange: setWaveformSettings,
      onLocalWaveformSettingsChange: setLocalWaveformSettings,
      onWaveformEnabledChange: setWaveformEnabled,
    }),
    [
      backgroundSettings,
      waveformEnabled,
      isTTSSpeaking,
      isPlayingMP3,
      audioElement,
      isUsingKokoro,
      analyserNode,
      isIdle,
      waveformLayers,
      waveformSettings,
      systemDataSource,
      shouldShowControlPanel,
      backgroundControlsOpen,
      setBackgroundSettings,
      setWaveformLayers,
      setWaveformSettings,
      setLocalWaveformSettings,
      setWaveformEnabled,
      setBackgroundControlsOpen,
    ]
  );

  const transcriptionProps = useMemo(
    () => ({
      onTranscriptionComplete: (text: string) => setInput(text),
      onTranscriptionStart: transcription.startRecording,
      onTranscriptionStop: transcription.stopRecording,
      disableTranscription: isLoading,
      transcription: {
        isRecording: transcription.isRecording,
        isTranscribing: transcription.isTranscribing,
        audioLevel: transcription.audioLevel,
        error: transcription.error,
      },
    }),
    [
      transcription.startRecording,
      transcription.stopRecording,
      transcription.isRecording,
      transcription.isTranscribing,
      transcription.audioLevel,
      transcription.error,
      isLoading,
      setInput,
    ]
  );

  const handleTtsToggle = useCallback(
    () => setTtsEnabled((v) => !v),
    [setTtsEnabled]
  );
  const handleCloseError = useCallback(
    () => setChatError(null),
    [setChatError]
  );
  const handleShowPerformanceSettings = useCallback(
    () => setShowPerformanceSettings(true),
    [setShowPerformanceSettings]
  );
  const handleClosePerformanceSettings = useCallback(
    () => setShowPerformanceSettings(false),
    [setShowPerformanceSettings]
  );
  const handleToggleConversationList = useCallback(
    () => setShowConversationList((v) => !v),
    [setShowConversationList]
  );
  const handleStop = useCallback(() => {
    stop();
    stopTTS();
  }, [stop, stopTTS]);
  const handleConversationLoad = useCallback((conversationId: string) => {
    const setCurrentConversation =
      useConversationStore.getState().setCurrentConversation;
    setCurrentConversation(conversationId);
  }, []);

  // ============================================================================
  // TERMINAL MODE RENDER
  // ============================================================================
  if (layoutMode === 'terminal') {
    return (
      <TerminalModeView
        {...backgroundProps}
        processedMessages={processedMessages}
        isLoading={isLoading}
        isLoadingMessages={isLoadingMessages}
        onPromptSubmit={handleSubmitMessage}
        conversations={conversations}
        onCreateConversation={createConversation}
        onExitToChat={exitTerminalToChat}
        onConversationLoad={handleConversationLoad}
      />
    );
  }

  // ============================================================================
  // CORPO MODE RENDER
  // ============================================================================
  if (layoutMode === 'corpo') {
    return (
      <CorpoModeView
        background={backgroundProps}
        drawerOpen={corpoDrawerOpen}
        onDrawerOpenChange={setCorpoDrawerOpen}
        processedMessages={processedMessages}
        isLoading={isLoading}
        isLoadingMessages={isLoadingMessages}
        messagesContainerRef={messagesContainerRef}
        messagesParentRef={messagesParentRef}
        virtualizer={virtualizer}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmitMessage}
        promptInputBackgroundColor={promptInputBackgroundColor}
        sidebarBackgroundColor={sidebarBackgroundColor}
        usedTokens={usedTokens}
        maxContextTokens={maxContextTokens}
        tokenUsage={tokenUsage}
        {...transcriptionProps}
        conversationListRef={conversationListRef}
        onConversationSelect={handleConversationSelect}
        createConversation={createConversation}
        onShowPerformanceSettings={handleShowPerformanceSettings}
        onDeleteMessage={handleDeleteMessage}
        chatError={chatError}
        onCloseError={handleCloseError}
        ttsEnabled={ttsEnabled}
        onTtsToggle={handleTtsToggle}
        isTTSSpeaking={isTTSSpeaking}
        onStopAudio={stopTTS}
        effectiveConversationId={effectiveConversationId}
        conversations={conversations}
        loadConversationMessages={loadConversationMessages}
        purgeDuplicateMessages={purgeDuplicateMessages}
        clearAllConversations={clearAllConversations}
        showPerformanceSettings={showPerformanceSettings}
        onClosePerformanceSettings={handleClosePerformanceSettings}
      />
    );
  }

  // ============================================================================
  // STANDARD MODE RENDER
  // ============================================================================
  return (
    <StandardModeView
      {...backgroundProps}
      sidebarVisible={sidebarVisible}
      onSidebarVisibleChange={setSidebarVisible}
      sidebarBackgroundColor={sidebarBackgroundColor}
      sidebarHeaderBackgroundColor={sidebarHeaderBackgroundColor}
      promptInputBackgroundColor={promptInputBackgroundColor}
      showConversationList={showConversationList}
      onToggleConversationList={handleToggleConversationList}
      onCreateConversation={createConversation}
      canStop={canStop}
      onStop={handleStop}
      canRegenerate={canRegenerate}
      onRegenerate={regenerate}
      ttsEnabled={ttsEnabled}
      onTtsToggle={handleTtsToggle}
      onStopAudio={stopTTS}
      onShowPerformanceSettings={handleShowPerformanceSettings}
      effectiveConversationId={effectiveConversationId}
      conversations={conversations}
      loadConversationMessages={loadConversationMessages}
      purgeDuplicateMessages={purgeDuplicateMessages}
      clearAllConversations={clearAllConversations}
      conversationListRef={conversationListRef}
      onConversationSelect={handleConversationSelect}
      chatError={chatError}
      onCloseError={handleCloseError}
      messagesContainerRef={messagesContainerRef}
      messagesParentRef={messagesParentRef}
      virtualizer={virtualizer}
      processedMessages={processedMessages}
      isLoading={isLoading}
      isLoadingMessages={isLoadingMessages}
      onDeleteMessage={handleDeleteMessage}
      input={input}
      onInputChange={setInput}
      onSubmit={handleSubmitMessage}
      usedTokens={usedTokens}
      maxContextTokens={maxContextTokens}
      tokenUsage={tokenUsage}
      {...transcriptionProps}
      showPerformanceSettings={showPerformanceSettings}
      onClosePerformanceSettings={handleClosePerformanceSettings}
    />
  );
};
