/**
 * TerminalModeView.tsx — Wiring view that hosts the terminal layout inside the chat surface.
 *
 * @module components/chat/TerminalModeView
 */

import { CircularVisualization } from '@/components/animations/CircularVisualization';
import { BackgroundControlPanel } from '@/components/background/BackgroundControlPanel';
import { BackgroundSwitcher } from '@/components/background/BackgroundSwitcher';
import { Box } from '@chakra-ui/react';
import { memo } from 'react';
import { BackgroundControlsToggle } from './BackgroundControlsToggle';
import { TerminalChat } from './terminal/TerminalChat';
import { TerminalLayout } from './terminal/TerminalLayout';
import type { TerminalModeViewProps } from './InterlocutorChatTypes';

const TerminalModeViewComponent = ({
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
  processedMessages,
  isLoading,
  isLoadingMessages,
  onPromptSubmit,
  conversations,
  onCreateConversation,
  onExitToChat,
  onConversationLoad,
}: TerminalModeViewProps) => (
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

    <TerminalLayout>
      <TerminalChat
        messages={processedMessages}
        isLoading={isLoading}
        isLoadingMessages={isLoadingMessages}
        onPromptSubmit={onPromptSubmit}
        conversations={conversations}
        onConversationLoad={onConversationLoad}
        onCreateConversation={onCreateConversation}
        onExitToChat={onExitToChat}
      />
    </TerminalLayout>
  </Box>
);

export const TerminalModeView = memo(TerminalModeViewComponent);
