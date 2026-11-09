import { useSettingsStore } from '@/lib/settings-store';
import { Box, Text } from '@chakra-ui/react';
import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import {
  DEFAULT_SYSTEM_TEXT,
  systemTextAnimationCss,
} from './systemTextAnimation';
import { useCircularWaveformData } from './circular-waveform/useCircularWaveformData';
import { MAX_DPR, useElementVisible } from './perf';
import { WaveformScene } from './circular-waveform/WaveformScene';
import type { CircularWaveformProps } from './circular-waveform/types';

export type { CircularWaveformProps } from './circular-waveform/types';

export const CircularWaveform = (props: CircularWaveformProps) => {
  const { isActive, isIdle = false } = props;
  const boxRef = useRef<HTMLDivElement>(null);
  const visible = useElementVisible(boxRef);
  const {
    systemDataSource,
    settingsRef,
    pulsePhase,
    baseWaveformData,
    layers,
  } = useCircularWaveformData(props);

  const systemTextOpts = useSettingsStore(
    useShallow(
      (state) => state.settings?.background?.systemText ?? DEFAULT_SYSTEM_TEXT
    )
  );
  const systemTextCss = useMemo(
    () => systemTextAnimationCss(systemTextOpts, 'systemTextFadeWaveform'),
    [systemTextOpts]
  );

  if (!isActive && !isIdle) return null;

  return (
    <Box
      ref={boxRef}
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={5}
      pointerEvents="none"
      touchAction="none"
      width="100%"
      height="100%"
      minWidth="0"
      minHeight="0"
      flexShrink={0}
      opacity={isIdle ? 0.5 : 0.9}
      transition="opacity 0.3s ease-in-out"
    >
      {/* System data source label - centered in waveform */}
      {systemDataSource.showSourceLabel && isIdle && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={10}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          fontSize={{ base: 'xs', md: 'sm', lg: 'md' }}
          letterSpacing="0.1em"
          css={systemTextCss}
        >
          <Text
            as="span"
            color="cyan.400"
            fontWeight={600}
            fontSize={{ base: 'xs', md: 'sm', lg: 'md' }}
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
            }}
          >
            [SYSTEM]:
          </Text>
          <Text
            as="span"
            ml={3}
            color="gray.300"
            fontSize={{ base: 'xs', md: 'sm', lg: 'md' }}
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
            }}
          >
            {systemDataSource.currentSource.description}
          </Text>
        </Box>
      )}
      <Canvas
        orthographic
        dpr={MAX_DPR}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0, 5], zoom: 35 }}
        gl={{
          antialias: true,
          alpha: true,
        }}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        onCreated={({ gl, camera, size }) => {
          gl.setClearColor(0x000000, 0);
          // Initialize orthographic camera to match canvas aspect ratio for perfect circle
          if (camera instanceof THREE.OrthographicCamera) {
            const baseViewSize = 28;
            const aspect = size.width / size.height;
            // Match camera viewport to canvas aspect ratio so circle appears as perfect circle
            camera.left = -baseViewSize * aspect;
            camera.right = baseViewSize * aspect;
            camera.top = baseViewSize;
            camera.bottom = -baseViewSize;
            camera.updateProjectionMatrix();
          }
        }}
      >
        <WaveformScene
          layers={layers}
          settingsRef={settingsRef}
          isIdle={isIdle}
          pulsePhase={pulsePhase}
          baseWaveformData={baseWaveformData}
        />
      </Canvas>
    </Box>
  );
};
