/**
 * @file Voice visualizer — renders a WaveSurfer waveform for recorded or
 * playing voice audio.
 * @module components/animations/VoiceVisualizer
 */

import type { ReactElement } from 'react';
import { Box } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

/** Props for the voice visualizer component. */
interface VoiceVisualizerProps {
  readonly isActive?: boolean;
  readonly audioUrl?: string;
}

const WAVEFORM_HEIGHT = 60;

/**
 * Renders a waveform visualization for voice audio playback.
 * @param props - Visualizer properties.
 * @returns The visualizer element, or null when inactive.
 */
export const VoiceVisualizer = ({
  isActive = false,
  audioUrl,
}: VoiceVisualizerProps): ReactElement | null => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  // Create the player only while active, and destroy it when deactivating.
  // Previously this effect ran once on mount ([]) while the component
  // returned null when inactive — containerRef was null, WaveSurfer was
  // never created, and the [] dependency never re-ran, so toggling the
  // visualizer on later produced a permanently empty box.
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#a78bfa',
      progressColor: '#8b5cf6',
      cursorColor: '#c4b5fd',
      barWidth: 2,
      barRadius: 3,
      height: WAVEFORM_HEIGHT,
      normalize: true,
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
      if (wavesurferRef.current === wavesurfer) {
        wavesurferRef.current = null;
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!audioUrl || !wavesurferRef.current) return;
    wavesurferRef.current
      .load(audioUrl)
      .catch((error) =>
        console.error('VoiceVisualizer: failed to load audio', error)
      );
  }, [audioUrl]);

  useEffect(() => {
    if (!wavesurferRef.current) return;
    if (isActive) {
      wavesurferRef.current
        .play()
        .catch((error) =>
          console.error('VoiceVisualizer: failed to play audio', error)
        );
    } else {
      wavesurferRef.current.pause();
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <Box
      p={4}
      borderTop="1px"
      borderColor="gray.700"
      width="min(100vw, 720px)"
      maxWidth="100vw"
      mx="auto"
      boxSizing="border-box"
      style={{ touchAction: 'none' }}
    >
      <Box
        ref={containerRef}
        width="100%"
        maxWidth="100%"
        minWidth={0}
        height={`${WAVEFORM_HEIGHT}px`}
        minHeight={`${WAVEFORM_HEIGHT}px`}
        boxSizing="border-box"
        style={{ touchAction: 'none' }}
        css={{
          '& canvas': {
            width: '100% !important',
            maxWidth: '100%',
            display: 'block',
            touchAction: 'none',
          },
        }}
      />
    </Box>
  );
};
