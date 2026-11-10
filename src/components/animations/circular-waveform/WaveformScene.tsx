import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { MutableRefObject, ReactElement } from 'react';
import * as THREE from 'three';
import { WaveformLayerMesh } from './WaveformLayerMesh';
import type { WaveformLayer, WaveformSettings } from './types';

/**
 * @file Circular waveform scene — camera adjustment plus one instanced bar
 * mesh per waveform layer.
 */

/** Half-height (in scene units) of the orthographic view. */
const BASE_VIEW_SIZE = 28;

/**
 * Camera adjustment component to maintain a perfect circle.
 * @returns Null (camera-only side effect).
 */
function CameraAdjuster(): ReactElement | null {
  const { camera, size } = useThree();
  const lastAspectRef = useRef(0);

  useFrame(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      // Own the frustum: without `manual`, R3F's resize handler overwrites
      // left/right/top/bottom with pixel values (±width/2, ±height/2), which
      // shrinks the world-unit waveform to a tiny dot on large canvases.
      camera.manual = true;
      if (size.height <= 0) return;
      const aspect = size.width / size.height;
      if (aspect === lastAspectRef.current) return;
      lastAspectRef.current = aspect;

      // Match camera viewport to canvas aspect ratio so circle appears as perfect circle
      camera.left = -BASE_VIEW_SIZE * aspect;
      camera.right = BASE_VIEW_SIZE * aspect;
      camera.top = BASE_VIEW_SIZE;
      camera.bottom = -BASE_VIEW_SIZE;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/** Props for the circular waveform scene. */
export interface WaveformSceneProps {
  readonly layers: readonly WaveformLayer[];
  readonly settingsRef: MutableRefObject<WaveformSettings>;
  readonly isIdle: boolean;
  readonly pulsePhase: number;
  readonly baseWaveformData: readonly number[];
}

/**
 * Render the circular waveform scene (one bar layer per waveform layer).
 * @param props - Layers, settings ref, idle state, pulse phase, and sample data.
 * @returns The scene fragment.
 */
export function WaveformScene({
  layers,
  settingsRef,
  isIdle,
  pulsePhase,
  baseWaveformData,
}: WaveformSceneProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <CameraAdjuster />
      <group ref={groupRef}>
        {layers.map((layer, index) => {
          // Read settings from ref for real-time updates
          const currentSettings = settingsRef.current;
          const baseRadius = currentSettings.radius * 2;
          const pulseAmplitude =
            isIdle && currentSettings.breathingEnabled
              ? Math.sin(pulsePhase) * currentSettings.breathingIntensity +
                (1 - currentSettings.breathingIntensity)
              : 1;
          const radius = baseRadius * pulseAmplitude;

          return (
            <WaveformLayerMesh
              key={layer.id}
              layer={layer}
              baseRadius={radius}
              pointCount={currentSettings.pointCount}
              pulseAmplitude={pulseAmplitude}
              baseWaveformData={baseWaveformData}
              isIdle={isIdle}
              layerIndex={index}
              pulsePhase={pulsePhase}
              settings={currentSettings}
            />
          );
        })}
      </group>
    </>
  );
}
