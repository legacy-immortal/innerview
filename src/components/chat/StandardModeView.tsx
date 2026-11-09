/**
 * StandardModeView.tsx — Standard two-pane chat layout (sidebar + message stream + input).
 *
 * @module components/chat/StandardModeView
 */

import { SettingsModal } from '@/components/SettingsModal';
import { CircularVisualization } from '@/components/animations/CircularVisualization';
import { BackgroundControlPanel } from '@/components/background/BackgroundControlPanel';
import { BackgroundSwitcher } from '@/components/background/BackgroundSwitcher';
import { Box } from '@chakra-ui/react';
import { memo } from 'react';
import { ChatHeader } from './condensed/ChatHeader';
import { ChatInput } from './condensed/ChatInput';
import { ConversationList } from './condensed/ConversationList';
import { MessagesContainer } from './condensed/MessagesContainer';
import { ResizableSidebar } from './condensed/ResizableSidebar';
import { ErrorAlert } from './shared/ErrorAlert';
import { BackgroundControlsToggle } from './BackgroundControlsToggle';
import type { StandardModeViewProps } from './InterlocutorChatTypes';

const StandardModeViewComponent = ({
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
  onBackgroundControlsToggle,
  onBackgroundSettingsChange,
  onWaveformLayersChange,
  onWaveformSettingsChange,
  onLocalWaveformSettingsChange,
  onWaveformEnabledChange,
  sidebarVisible,
  onSidebarVisibleChange,
  sidebarBackgroundColor,
  sidebarHeaderBackgroundColor,
  promptInputBackgroundColor,
  showConversationList,
  onToggleConversationList,
  onCreateConversation,
  canStop,
  onStop,
  canRegenerate,
  onRegenerate,
  ttsEnabled,
  onTtsToggle,
  onStopAudio,
  onShowPerformanceSettings,
  effectiveConversationId,
  conversations,
  loadConversationMessages,
  purgeDuplicateMessages,
  clearAllConversations,
  conversationListRef,
  onConversationSelect,
  chatError,
  onCloseError,
  messagesContainerRef,
  messagesParentRef,
  virtualizer,
  processedMessages,
  isLoading,
  isLoadingMessages,
  onDeleteMessage,
  input,
  onInputChange,
  onSubmit,
  usedTokens,
  maxContextTokens,
  tokenUsage,
  onTranscriptionComplete,
  onTranscriptionStart,
  onTranscriptionStop,
  disableTranscription,
  transcription,
  showPerformanceSettings,
  onClosePerformanceSettings,
}: StandardModeViewProps) => (
  <Box position="relative" h="100dvh" w="100vw" bg="black" overflow="hidden">
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
        onSettingsChange={onBackgroundSettingsChange}
        waveformLayers={waveformLayers}
        onWaveformLayersChange={onWaveformLayersChange}
        waveformSettings={waveformSettings}
        onWaveformSettingsChange={onWaveformSettingsChange}
        onLocalWaveformSettingsChange={onLocalWaveformSettingsChange}
        waveformEnabled={waveformEnabled}
        onWaveformEnabledChange={onWaveformEnabledChange}
      />
    )}

    {shouldShowControlPanel() && (
      <BackgroundControlsToggle
        open={backgroundControlsOpen}
        onToggle={onBackgroundControlsToggle}
      />
    )}

    {/* Responsive: narrower sidebar and hidden by default on small screens
        (Chakra md = 48rem = 768px). Widths stay clamped to 85vw so the
        sidebar never overflows small/tablet viewports. */}
    <Box
      position="relative"
      zIndex={10}
      h="100%"
      w="100%"
      maxW="100%"
      display="flex"
      flexDirection="row"
    >
      <ResizableSidebar
        defaultWidth={Math.min(400, Math.max(240, window.innerWidth * 0.7))}
        minWidth={160}
        maxWidth={Math.min(800, window.innerWidth * 0.85)}
        visible={window.innerWidth < 768 ? false : sidebarVisible}
        onVisibilityChange={onSidebarVisibleChange}
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
            onToggleConversationList={onToggleConversationList}
            onCreateConversation={onCreateConversation}
            canStop={canStop}
            onStop={onStop}
            canRegenerate={canRegenerate}
            onRegenerate={onRegenerate}
            sidebarHeaderBackgroundColor={sidebarHeaderBackgroundColor}
            ttsEnabled={ttsEnabled}
            onTtsToggle={onTtsToggle}
            isTTSSpeaking={isTTSSpeaking}
            onStopAudio={onStopAudio}
            onShowPerformanceSettings={onShowPerformanceSettings}
            effectiveConversationId={effectiveConversationId}
            conversations={conversations}
            loadConversationMessages={loadConversationMessages}
            purgeDuplicateMessages={purgeDuplicateMessages}
            clearAllConversations={clearAllConversations}
            createConversation={onCreateConversation}
            conversationListRef={conversationListRef}
          />

          {/* Error banner */}
          {chatError && <ErrorAlert error={chatError} onClose={onCloseError} />}

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
                onConversationSelect={onConversationSelect}
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
                onDeleteMessage={onDeleteMessage}
              />
              <ChatInput
                input={input}
                onInputChange={onInputChange}
                onSubmit={onSubmit}
                promptInputBackgroundColor={promptInputBackgroundColor}
                sidebarBackgroundColor={sidebarBackgroundColor}
                usedTokens={usedTokens}
                maxContextTokens={maxContextTokens}
                tokenUsage={tokenUsage}
                onTranscriptionComplete={onTranscriptionComplete}
                onTranscriptionStart={onTranscriptionStart}
                onTranscriptionStop={onTranscriptionStop}
                disableTranscription={disableTranscription}
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
      onClose={onClosePerformanceSettings}
    />
  </Box>
);

export const StandardModeView = memo(StandardModeViewComponent);
