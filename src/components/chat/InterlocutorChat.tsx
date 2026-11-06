import { SettingsModal } from '@/components/SettingsModal';
import { CircularVisualization } from '@/components/animations/CircularVisualization';
import { BackgroundControlPanel } from '@/components/background/BackgroundControlPanel';
import { BackgroundSwitcher } from '@/components/background/BackgroundSwitcher';
import {
  ConversationList,
  type ConversationListRef,
} from '@/components/chat/condensed/ConversationList';
import { ResizableSidebar } from '@/components/chat/condensed/ResizableSidebar';
import { ErrorAlert } from '@/components/chat/shared/ErrorAlert';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import {
  useInterlocutorChat,
  type InterlocutorChatError,
} from '@/hooks/useInterlocutorChat';
import { useStreamingMessages } from '@/hooks/useStreamingMessages';
import { useSystemDataSource } from '@/hooks/useSystemDataSource';
import { useTTS } from '@/hooks/useTTS';
import { useTranscription } from '@/hooks/useTranscription';
import { useVisualizationSettings } from '@/hooks/useVisualizationSettings';
import { useConversationStore } from '@/lib/conversation-store';
import { useSettingsStore } from '@/lib/settings-store';
import { extractMessageText } from '@/utils/message-conversion';
import { Box, HStack, IconButton } from '@chakra-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { LuSlidersHorizontal } from 'react-icons/lu';
import { useShallow } from 'zustand/react/shallow';
import { ChatHeader } from './condensed/ChatHeader';
import { ChatInput } from './condensed/ChatInput';
import { MessagesContainer } from './condensed/MessagesContainer';
import { CorpoLayout } from './corpo/CorpoLayout';
import { TerminalChat } from './terminal/TerminalChat';
import { TerminalLayout } from './terminal/TerminalLayout';

export const InterlocutorChat = () => {
  // ============================================================================
  // SETTINGS & CONFIGURATION
  // ============================================================================
  const reasoningTag = useSettingsStore(
    (state) => state.settings?.generation?.reasoningTag || 'thinking'
  );
  const streamingEnabled = useSettingsStore(
    (state) => state.settings?.generation?.streamingEnabled !== false
  );
  const layoutMode = useSettingsStore(
    (state) => state.settings?.style?.mode || 'condensed'
  );
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

  const handleChatError = useCallback((error: InterlocutorChatError) => {
    setChatError(error);
  }, []);

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
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
  const tokenUsage = React.useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    processedMessages.forEach((msg) => {
      const text = extractMessageText(msg);
      const estimatedTokens = Math.ceil(text.length / 4);
      if (msg.role === 'user') inputTokens += estimatedTokens;
      else if (msg.role === 'assistant') outputTokens += estimatedTokens;
    });
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }, [processedMessages]);

  const maxContextTokens = 128000;
  const usedTokens = tokenUsage.totalTokens;

  // ============================================================================
  // SYSTEM DATA SOURCE & VISUALIZATION
  // ============================================================================
  const isIdle = !isTTSSpeaking && !isPlayingMP3 && !isLoading;
  const contextUsage = { used: usedTokens, max: maxContextTokens };
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

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  const keyboardSettings = getKeyboardSettings();
  const transcriptionKey = keyboardSettings?.transcriptionKey || '`';
  const keyboardEnabled = keyboardSettings?.enabled !== false;
  const submitKeypress = keyboardSettings?.submitKeypress || 'shift+enter';
  const prevVisualizationKey = keyboardSettings?.prevVisualizationKey ?? ',';
  const nextVisualizationKey = keyboardSettings?.nextVisualizationKey ?? '.';
  const exitTerminalKey = keyboardSettings?.exitTerminalKey ?? 'ctrl+shift+e';

  // Transcription settings from user preferences
  const transcriptionSettings = getTranscriptionSettings();
  const transcriptionProvider = transcriptionSettings?.provider || 'openai';

  // Push-to-talk keyboard handling is done by useGlobalKeyboardShortcuts below,
  // so we disable the internal handler in useTranscription to avoid conflicts.
  const transcription = useTranscription({
    provider: transcriptionProvider,
    onTranscriptionComplete: (result) => {
      setInput(result?.text ?? '');
    },
    enablePushToTalk: false,
  });

  // Disable transcription push-to-talk while chat is loading or settings modal is open
  // to avoid parallel load on the backend (transcription + LLM competing can cause 503s).
  const { isInputFocusedRef } = useGlobalKeyboardShortcuts({
    onTranscriptionStart: transcription.startRecording,
    onTranscriptionStop: transcription.stopRecording,
    transcriptionKey,
    transcriptionEnabled: !isLoading && !showPerformanceSettings,
    submitKeypress,
    onSubmit: () => {
      if (input.trim()) {
        handleSubmitMessage(input);
      }
    },
    onSubmitWithNewline: () => {
      // Allows newline in input (opposite of submit key)
    },
    enabled: keyboardEnabled && !showPerformanceSettings,
  });

  // Keyboard shortcuts to cycle through visualizations (configurable in settings)
  useHotkeys(
    prevVisualizationKey,
    (event) => {
      if (!keyboardEnabled || !waveformEnabled || isInputFocusedRef.current) {
        return;
      }
      event.preventDefault();
      navigateToVisualizationType('prev', visualizationTypeRef.current);
    },
    {
      preventDefault: true,
      enabled: keyboardEnabled && waveformEnabled && !showPerformanceSettings,
    },
    [
      keyboardEnabled,
      waveformEnabled,
      navigateToVisualizationType,
      prevVisualizationKey,
    ]
  );

  useHotkeys(
    nextVisualizationKey,
    (event) => {
      if (!keyboardEnabled || !waveformEnabled || isInputFocusedRef.current) {
        return;
      }
      event.preventDefault();
      navigateToVisualizationType('next', visualizationTypeRef.current);
    },
    {
      preventDefault: true,
      enabled: keyboardEnabled && waveformEnabled && !showPerformanceSettings,
    },
    [
      keyboardEnabled,
      waveformEnabled,
      navigateToVisualizationType,
      nextVisualizationKey,
    ]
  );

  // ============================================================================
  // REFS
  // ============================================================================
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
    estimateSize: () => 150,
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
      }, 150);

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
      }, 800);
      return () => clearTimeout(timeoutId);
    }
    prevShowConversationListRef.current = showConversationList;
  }, [showConversationList]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleConversationSelect = useCallback(() => {
    setShowConversationList(false);
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const shouldShowControlPanel = () =>
    (performanceSettings?.maxBackgroundComplexity ?? 'minimal') !== 'minimal';

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

  // ============================================================================
  // TERMINAL MODE RENDER
  // ============================================================================
  if (layoutMode === 'terminal') {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        w="100vw"
        bg="transparent"
        overflow="hidden"
      >
        <BackgroundSwitcher settings={backgroundSettings} />

        {waveformEnabled && (
          <CircularVisualization
            isActive={isTTSSpeaking || isPlayingMP3}
            audioElement={isPlayingMP3 ? audioElement : null}
            analyserNode={isUsingKokoro && !isPlayingMP3 ? analyserNode : null}
            useSpeechSynthesis={!isUsingKokoro && !isPlayingMP3}
            isIdle={isIdle}
            layers={waveformLayers}
            settings={waveformSettings}
            systemDataSource={systemDataSource}
          />
        )}

        {shouldShowControlPanel() && backgroundControlsOpen && (
          <BackgroundControlPanel
            settings={backgroundSettings}
            onSettingsChange={setBackgroundSettings}
            waveformLayers={waveformLayers}
            onWaveformLayersChange={setWaveformLayers}
            waveformSettings={waveformSettings}
            onWaveformSettingsChange={setWaveformSettings}
            onLocalWaveformSettingsChange={setLocalWaveformSettings}
            waveformEnabled={waveformEnabled}
            onWaveformEnabledChange={setWaveformEnabled}
          />
        )}

        {shouldShowControlPanel() && (
          <HStack
            position="fixed"
            top={3}
            left={3}
            zIndex={20}
            gap={1}
            align="center"
          >
            <IconButton
              aria-label={
                backgroundControlsOpen
                  ? 'Hide background controls'
                  : 'Show background controls'
              }
              size="sm"
              variant="ghost"
              colorPalette="gray"
              opacity={0.85}
              onClick={() => setBackgroundControlsOpen((prev) => !prev)}
              bg={
                backgroundControlsOpen
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'transparent'
              }
            >
              <LuSlidersHorizontal />
            </IconButton>
          </HStack>
        )}

        <TerminalLayout>
          <TerminalChat
            messages={processedMessages}
            isLoading={isLoading}
            isLoadingMessages={isLoadingMessages}
            onPromptSubmit={handleSubmitMessage}
            conversations={conversations}
            onConversationLoad={(conversationId) => {
              const setCurrentConversation =
                useConversationStore.getState().setCurrentConversation;
              setCurrentConversation(conversationId);
            }}
            onCreateConversation={createConversation}
            onExitToChat={exitTerminalToChat}
          />
        </TerminalLayout>
      </Box>
    );
  }

  // ============================================================================
  // CORPO MODE RENDER
  // ============================================================================
  if (layoutMode === 'corpo') {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        w="100vw"
        bg="transparent"
        overflow="hidden"
      >
        <BackgroundSwitcher settings={backgroundSettings} />

        {waveformEnabled && (
          <CircularVisualization
            isActive={isTTSSpeaking || isPlayingMP3}
            audioElement={isPlayingMP3 ? audioElement : null}
            analyserNode={isUsingKokoro && !isPlayingMP3 ? analyserNode : null}
            useSpeechSynthesis={!isUsingKokoro && !isPlayingMP3}
            isIdle={isIdle}
            layers={waveformLayers}
            settings={waveformSettings}
            systemDataSource={systemDataSource}
          />
        )}

        {shouldShowControlPanel() && (
          <BackgroundControlPanel
            settings={backgroundSettings}
            onSettingsChange={setBackgroundSettings}
            waveformLayers={waveformLayers}
            onWaveformLayersChange={setWaveformLayers}
            waveformSettings={waveformSettings}
            onWaveformSettingsChange={setWaveformSettings}
            onLocalWaveformSettingsChange={setLocalWaveformSettings}
            waveformEnabled={waveformEnabled}
            onWaveformEnabledChange={setWaveformEnabled}
          />
        )}

        <Box position="relative" zIndex={10} h="100%" w="100%">
          <CorpoLayout
            drawerOpen={corpoDrawerOpen}
            onDrawerOpenChange={setCorpoDrawerOpen}
            messages={processedMessages}
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
            onTranscriptionComplete={(text) => setInput(text)}
            onTranscriptionStart={transcription.startRecording}
            onTranscriptionStop={transcription.stopRecording}
            disableTranscription={isLoading}
            isRecording={transcription.isRecording}
            isTranscribing={transcription.isTranscribing}
            audioLevel={transcription.audioLevel}
            transcriptionError={transcription.error}
            conversationListRef={conversationListRef}
            onConversationSelect={handleConversationSelect}
            createConversation={createConversation}
            onShowPerformanceSettings={() => setShowPerformanceSettings(true)}
            onDeleteMessage={handleDeleteMessage}
            chatError={chatError}
            onCloseError={() => setChatError(null)}
            ttsEnabled={ttsEnabled}
            onTtsToggle={() => setTtsEnabled(!ttsEnabled)}
            isTTSSpeaking={isTTSSpeaking}
            onStopAudio={stopTTS}
            effectiveConversationId={effectiveConversationId}
            conversations={conversations}
            loadConversationMessages={loadConversationMessages}
            purgeDuplicateMessages={purgeDuplicateMessages}
            clearAllConversations={clearAllConversations}
          />
        </Box>

        <SettingsModal
          isOpen={showPerformanceSettings}
          onClose={() => setShowPerformanceSettings(false)}
        />
      </Box>
    );
  }

  // ============================================================================
  // STANDARD MODE RENDER
  // ============================================================================
  return (
    <Box position="relative" h="100vh" w="100vw" bg="black" overflow="hidden">
      <BackgroundSwitcher settings={backgroundSettings} />

      {waveformEnabled && (
        <CircularVisualization
          isActive={isTTSSpeaking || isPlayingMP3}
          audioElement={isPlayingMP3 ? audioElement : null}
          analyserNode={isUsingKokoro && !isPlayingMP3 ? analyserNode : null}
          useSpeechSynthesis={!isUsingKokoro && !isPlayingMP3}
          isIdle={isIdle}
          layers={waveformLayers}
          settings={waveformSettings}
          systemDataSource={systemDataSource}
        />
      )}

      {shouldShowControlPanel() && backgroundControlsOpen && (
        <BackgroundControlPanel
          settings={backgroundSettings}
          onSettingsChange={setBackgroundSettings}
          waveformLayers={waveformLayers}
          onWaveformLayersChange={setWaveformLayers}
          waveformSettings={waveformSettings}
          onWaveformSettingsChange={setWaveformSettings}
          onLocalWaveformSettingsChange={setLocalWaveformSettings}
          waveformEnabled={waveformEnabled}
          onWaveformEnabledChange={setWaveformEnabled}
        />
      )}

      {shouldShowControlPanel() && (
        <HStack
          position="fixed"
          top={3}
          left={3}
          zIndex={20}
          gap={1}
          align="center"
        >
          <IconButton
            aria-label={
              backgroundControlsOpen
                ? 'Hide background controls'
                : 'Show background controls'
            }
            size="sm"
            variant="ghost"
            colorPalette="gray"
            opacity={0.85}
            onClick={() => setBackgroundControlsOpen((prev) => !prev)}
            bg={
              backgroundControlsOpen
                ? 'rgba(255, 255, 255, 0.08)'
                : 'transparent'
            }
          >
            <LuSlidersHorizontal />
          </IconButton>
        </HStack>
      )}

      <Box
        position="relative"
        zIndex={10}
        h="100%"
        display="flex"
        flexDirection="row"
      >
        <ResizableSidebar
          defaultWidth={400}
          minWidth={200}
          maxWidth={800}
          visible={sidebarVisible}
          onVisibilityChange={setSidebarVisible}
          backgroundColor={sidebarBackgroundColor}
        >
          <Box
            display="flex"
            flexDirection="column"
            h="100%"
            w="100%"
            maxW="100%"
            minW={0}
          >
            <ChatHeader
              showConversationList={showConversationList}
              onToggleConversationList={() =>
                setShowConversationList(!showConversationList)
              }
              onCreateConversation={createConversation}
              canStop={canStop}
              onStop={() => {
                stop();
                stopTTS();
              }}
              canRegenerate={canRegenerate}
              onRegenerate={regenerate}
              sidebarHeaderBackgroundColor={sidebarHeaderBackgroundColor}
              ttsEnabled={ttsEnabled}
              onTtsToggle={() => setTtsEnabled(!ttsEnabled)}
              isTTSSpeaking={isTTSSpeaking}
              onStopAudio={stopTTS}
              onShowPerformanceSettings={() => setShowPerformanceSettings(true)}
              effectiveConversationId={effectiveConversationId}
              conversations={conversations}
              loadConversationMessages={loadConversationMessages}
              purgeDuplicateMessages={purgeDuplicateMessages}
              clearAllConversations={clearAllConversations}
              createConversation={createConversation}
              conversationListRef={conversationListRef}
            />

            {/* Error banner */}
            {chatError && (
              <ErrorAlert
                error={chatError}
                onClose={() => setChatError(null)}
              />
            )}

            {showConversationList ? (
              <Box
                flex={1}
                overflow="hidden"
                w="100%"
                maxW="100%"
                minW={0}
                display="flex"
                flexDirection="column"
              >
                <ConversationList
                  ref={conversationListRef}
                  onConversationSelect={handleConversationSelect}
                />
              </Box>
            ) : (
              <Box position="relative" h="100%" w="100%" maxW="100%" minW={0}>
                <MessagesContainer
                  messages={processedMessages}
                  isLoading={isLoading}
                  isLoadingMessages={isLoadingMessages}
                  messagesContainerRef={messagesContainerRef}
                  messagesParentRef={messagesParentRef}
                  virtualizer={virtualizer}
                  onDeleteMessage={handleDeleteMessage}
                />
                <ChatInput
                  input={input}
                  onInputChange={setInput}
                  onSubmit={handleSubmitMessage}
                  promptInputBackgroundColor={promptInputBackgroundColor}
                  sidebarBackgroundColor={sidebarBackgroundColor}
                  usedTokens={usedTokens}
                  maxContextTokens={maxContextTokens}
                  tokenUsage={tokenUsage}
                  onTranscriptionComplete={(text) => {
                    setInput(text);
                  }}
                  onTranscriptionStart={transcription.startRecording}
                  onTranscriptionStop={transcription.stopRecording}
                  disableTranscription={isLoading}
                  isRecording={transcription.isRecording}
                  isTranscribing={transcription.isTranscribing}
                  audioLevel={transcription.audioLevel}
                  transcriptionError={transcription.error}
                />
              </Box>
            )}
          </Box>
        </ResizableSidebar>
      </Box>

      <SettingsModal
        isOpen={showPerformanceSettings}
        onClose={() => setShowPerformanceSettings(false)}
      />
    </Box>
  );
};
