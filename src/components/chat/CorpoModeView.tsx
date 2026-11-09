/**
 * CorpoModeView.tsx — Corpo (drawer-based) chat layout with background + transcription props.
 *
 * @module components/chat/CorpoModeView
 */

import { SettingsModal } from '@/components/SettingsModal';
import { CircularVisualization } from '@/components/animations/CircularVisualization';
import { BackgroundControlPanel } from '@/components/background/BackgroundControlPanel';
import { BackgroundSwitcher } from '@/components/background/BackgroundSwitcher';
import { Box } from '@chakra-ui/react';
import { memo } from 'react';
import { CorpoLayout } from './corpo/CorpoLayout';
import type { CorpoModeViewProps } from './InterlocutorChatTypes';

const CorpoModeViewComponent = ({
  background,
  drawerOpen,
  onDrawerOpenChange,
  processedMessages,
  isLoading,
  isLoadingMessages,
  messagesContainerRef,
  messagesParentRef,
  virtualizer,
  input,
  onInputChange,
  onSubmit,
  promptInputBackgroundColor,
  sidebarBackgroundColor,
  usedTokens,
  maxContextTokens,
  tokenUsage,
  onTranscriptionComplete,
  onTranscriptionStart,
  onTranscriptionStop,
  disableTranscription,
  transcription,
  conversationListRef,
  onConversationSelect,
  createConversation,
  onShowPerformanceSettings,
  onDeleteMessage,
  chatError,
  onCloseError,
  ttsEnabled,
  onTtsToggle,
  isTTSSpeaking,
  onStopAudio,
  effectiveConversationId,
  conversations,
  loadConversationMessages,
  purgeDuplicateMessages,
  clearAllConversations,
  showPerformanceSettings,
  onClosePerformanceSettings,
}: CorpoModeViewProps) => {
  const {
    backgroundSettings,
    waveformEnabled,
    isPlayingMP3,
    audioElement,
    isUsingKokoro,
    analyserNode,
    isIdle,
    waveformLayers,
    waveformSettings,
    systemDataSource,
    shouldShowControlPanel,
    onBackgroundSettingsChange,
    onWaveformLayersChange,
    onWaveformSettingsChange,
    onLocalWaveformSettingsChange,
    onWaveformEnabledChange,
  } = background;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      h="100dvh"
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

      <Box position="relative" zIndex={10} h="100%" w="100%">
        <CorpoLayout
          drawerOpen={drawerOpen}
          onDrawerOpenChange={onDrawerOpenChange}
          messages={processedMessages}
          isLoading={isLoading}
          isLoadingMessages={isLoadingMessages}
          messagesContainerRef={messagesContainerRef}
          messagesParentRef={messagesParentRef}
          virtualizer={virtualizer}
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
          conversationListRef={conversationListRef}
          onConversationSelect={onConversationSelect}
          createConversation={createConversation}
          onShowPerformanceSettings={onShowPerformanceSettings}
          onDeleteMessage={onDeleteMessage}
          chatError={chatError}
          onCloseError={onCloseError}
          ttsEnabled={ttsEnabled}
          onTtsToggle={onTtsToggle}
          isTTSSpeaking={isTTSSpeaking}
          onStopAudio={onStopAudio}
          effectiveConversationId={effectiveConversationId}
          conversations={conversations}
          loadConversationMessages={loadConversationMessages}
          purgeDuplicateMessages={purgeDuplicateMessages}
          clearAllConversations={clearAllConversations}
        />
      </Box>

      <SettingsModal
        isOpen={showPerformanceSettings}
        onClose={onClosePerformanceSettings}
      />
    </Box>
  );
};

export const CorpoModeView = memo(CorpoModeViewComponent);
