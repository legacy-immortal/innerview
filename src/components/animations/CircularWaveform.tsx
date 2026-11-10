/**
 * @file Circular waveform visualization — renders layered audio/system waveform
 * bars in a Three.js canvas.
 * @module components/animations/CircularWaveform
 */

import type { ReactElement } from 'react';
import { Box } from '@chakra-ui/react';
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useCircularWaveformData } from './circular-waveform/useCircularWaveformData';
import { MAX_DPR, useElementVisible } from './perf';
import { WaveformScene } from './circular-waveform/WaveformScene';
import type { CircularWaveformProps } from './circular-waveform/types';

export type { CircularWaveformProps } from './circular-waveform/types';

/**
 * Renders the circular waveform visualization.
 * @param props - Waveform configuration and data sources.
 * @returns The waveform element, or null when inactive.
 */
export const CircularWaveform = (
  props: CircularWaveformProps
): ReactElement | null => {
  const { isActive, isIdle = false } = props;
  const boxRef = useRef<HTMLDivElement>(null);
  const visible = useElementVisible(boxRef);
  const { settingsRef, pulsePhase, baseWaveformData, layers } =
    useCircularWaveformData(props);

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
      {/*
        NOTE: the "[SYSTEM]:" label is rendered by CircularVisualization
        (fullscreen-centered, animated via systemTextAnimation) — the only
        caller. Rendering it here too overlapped it pixel-perfectly at the
        same center (both boxes are centered), garbling the text.
      */}
      <Canvas
        orthographic
        dpr={MAX_DPR}
        frameloop={visible ? 'always' : 'never'}
        // Zoom 25 with BASE_VIEW_SIZE 28 shows ±1.12 world units vertically.
        // The default radius (0.25*2=0.5) plus max layer offset (0.42) and
        // bar length (~0.17) reaches ~0.88, so 25 keeps outer bars unclipped
        // while filling ~79% of the canvas height. (Zoom 35 showed ±0.8
        // and clipped the outermost bars.)
        camera={{ position: [0, 0, 5], zoom: 25 }}
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
            // Claim the frustum so R3F's resize handler doesn't overwrite
            // these world units with pixel values on the next resize.
            camera.manual = true;
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
