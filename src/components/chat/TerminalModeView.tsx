/**
 * @file TerminalModeView.tsx — Wiring view that hosts the terminal layout inside the chat surface.
 * @module components/chat/TerminalModeView
 *
 * Renders the terminal (CLI-style) chat layout consumed by `InterlocutorChat`. It hosts the
 * background switcher/visualization, the optional control panel, the fixed corner toggle, and
 * the `TerminalLayout`/`TerminalChat` pair. Consumed by `InterlocutorChat` when the layout mode
 * is `terminal`.
 */

import { CircularVisualization } from '@/components/animations/CircularVisualization';
import { BackgroundControlPanel } from '@/components/background/BackgroundControlPanel';
import { BackgroundSwitcher } from '@/components/background/BackgroundSwitcher';
import { Box, HStack } from '@chakra-ui/react';
import { memo, type JSX } from 'react';
import { BackgroundControlsToggle } from './BackgroundControlsToggle';
import { TerminalChat } from './terminal/TerminalChat';
import { TerminalLayout } from './terminal/TerminalLayout';
import type { TerminalModeViewProps } from './InterlocutorChatTypes';

/**
 * Renders the terminal chat layout with its background and controls.
 *
 * @param props - Terminal mode view props.
 * @returns The terminal mode view element.
 * @see {@link InterlocutorChatTypes.TerminalModeViewProps} for the prop contract.
 */
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
}: TerminalModeViewProps): JSX.Element => (
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
      <Box display={backgroundControlsOpen ? 'contents' : 'none'}>
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
      </Box>
    )}

    {/* Terminal has no sidebar chrome, so the sliders toggle stays in a
        fixed top-left corner strip of its own. */}
    {shouldShowControlPanel() && (
      <HStack position="fixed" top={3} left={3} zIndex={20}>
        <BackgroundControlsToggle
          open={backgroundControlsOpen}
          onToggle={onBackgroundControlsToggle}
        />
      </HStack>
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

/**
 * Memoized terminal (CLI-style) chat layout.
 *
 * @returns The memoized terminal mode view element.
 */
export const TerminalModeView = memo(TerminalModeViewComponent);
