import { Box } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface VoiceVisualizerProps {
  isActive?: boolean;
  audioUrl?: string;
}

export const VoiceVisualizer = ({
  isActive = false,
  audioUrl,
}: VoiceVisualizerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#a78bfa',
      progressColor: '#8b5cf6',
      cursorColor: '#c4b5fd',
      barWidth: 2,
      barRadius: 3,
      height: 60,
      normalize: true,
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, []);

  useEffect(() => {
    if (audioUrl && wavesurferRef.current) {
      wavesurferRef.current.load(audioUrl);
    }
  }, [audioUrl]);

  useEffect(() => {
    if (isActive && wavesurferRef.current) {
      wavesurferRef.current.play();
    } else if (wavesurferRef.current) {
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
