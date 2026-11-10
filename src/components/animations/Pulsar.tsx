/**
 * @file Pulsar background animation — renders a 3D pulsar waterfall plot from
 * PSR B1919+21 data (with synthetic fallback).
 * @module components/animations/Pulsar
 */

import type { ReactElement } from 'react';
import { Box } from '@chakra-ui/react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MAX_DPR } from './perf';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/** Settings controlling the pulsar background visualization. */
export interface PulsarBackgroundSettings {
  readonly lineSpacing: number;
  readonly lineColor: string;
  readonly bgColor: string;
  readonly rotationX: number;
  readonly rotationY: number;
  readonly scale: number;
  readonly verticalScale: number;
  readonly animationSpeed: number;
}

/** Props for the internal pulsar scene. */
interface PulsarSceneProps {
  readonly settings: PulsarBackgroundSettings;
}

/**
 * Synthetic fallback pulse profile used until (or unless) the remote pulsar
 * dataset loads, so the animation renders and oscillates even when the fetch
 * is blocked, offline, or slow.
 */
const FALLBACK_ROWS = 120;
const FALLBACK_COLS = 256;

/**
 * Generate a synthetic drifting pulse profile.
 * @returns Rows of pulse amplitudes resembling the PSR B1919+21 waterfall.
 */
function generateFallbackPulsarData(): number[][] {
  return Array.from({ length: FALLBACK_ROWS }, (_, i) => {
    // The pulse drifts slowly across columns as the row index increases,
    // mimicking the rotating beam of a pulsar sweeping past Earth.
    const drift = 30 + Math.sin(i * 0.08) * 12;
    return Array.from({ length: FALLBACK_COLS }, (_, j) => {
      // Two Gaussian pulses: a primary pulse at `drift` and a fainter
      // secondary pulse offset by 8 columns (the PSR B1919+21 double pulse).
      const pulse =
        Math.exp(-Math.pow(j - drift, 2) / 6) +
        0.6 * Math.exp(-Math.pow(j - drift - 8, 2) / 10);
      // Slow row/column modulation adds texture so the waterfall isn't
      // perfectly uniform between pulses.
      return pulse * (0.8 + 0.4 * Math.sin(i * 0.3 + j * 0.02));
    });
  });
}

/**
 * Renders the Three.js pulsar line scene.
 * @param props - Scene settings.
 * @returns The scene elements.
 */
function PulsarScene({ settings }: PulsarSceneProps): ReactElement {
  const linesRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const [pulsarData, setPulsarData] = useState<number[][]>(() =>
    generateFallbackPulsarData()
  );

  useEffect(() => {
    fetch(
      'https://raw.githubusercontent.com/maxkueng/PSR-B1919-21/master/pulsar.csv'
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`pulsar data request failed: ${response.status}`);
        }
        return response.text();
      })
      .then((csvText) => {
        const rows = csvText.trim().split('\n');
        const data = rows.map((row) =>
          row.split(',').map((val) => Number.parseFloat(val))
        );
        if (data.length > 0) {
          setPulsarData(data);
        }
      })
      .catch((error) => {
        // Keep the synthetic fallback so the animation still runs.
        console.error('Error loading pulsar data:', error);
      });
  }, []);

  const lines = useMemo(() => {
    if (pulsarData.length === 0) {
      return [];
    }

    const linesArray: THREE.Line[] = [];

    pulsarData.forEach((rowData, i) => {
      const points: THREE.Vector3[] = [];

      rowData.forEach((value, j) => {
        const x = (j / (rowData.length - 1)) * 10 - 5;
        const y = value * settings.verticalScale;
        const z =
          i * settings.lineSpacing -
          (pulsarData.length * settings.lineSpacing) / 2;

        points.push(new THREE.Vector3(x * settings.scale, y, z));
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(settings.lineColor),
        linewidth: 2,
      });

      const line = new THREE.Line(geometry, material);
      linesArray.push(line);
    });

    return linesArray;
  }, [
    pulsarData,
    settings.lineSpacing,
    settings.lineColor,
    settings.scale,
    settings.verticalScale,
  ]);

  useEffect(() => {
    if (linesRef.current) {
      while (linesRef.current.children.length > 0) {
        const child = linesRef.current.children[0];
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
        linesRef.current.remove(child);
      }

      lines.forEach((line) => {
        linesRef.current?.add(line);
      });
    }
  }, [lines]);

  useEffect(() => {
    if (linesRef.current) {
      linesRef.current.rotation.x = settings.rotationX;
      linesRef.current.rotation.y = settings.rotationY;
    }
  }, [settings.rotationX, settings.rotationY]);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y =
        settings.rotationY +
        Math.sin(state.clock.elapsedTime * settings.animationSpeed) * 0.05;
      const fit = Math.min(1, viewport.width / (10 * (settings.scale || 1)));
      linesRef.current.scale.set(fit, 1, 1);
    }
  });

  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <color attach="background" args={[settings.bgColor]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <ambientLight intensity={0.5} />
      <group ref={linesRef} />
    </>
  );
}

/** Props for the pulsar background component. */
interface PulsarProps {
  readonly settings: PulsarBackgroundSettings;
}

/**
 * Renders the pulsar background animation.
 * @param props - Pulsar settings.
 * @returns The pulsar canvas container.
 */
export default function Pulsar({ settings }: PulsarProps): ReactElement {
  return (
    <Box
      as="div"
      position="absolute"
      top={0}
      left={0}
      width="100vw"
      height="100dvh"
      maxWidth="100%"
      maxHeight="100%"
      minWidth={0}
      minHeight={0}
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
      boxSizing="border-box"
      style={{ touchAction: 'none' }}
    >
      <Canvas
        dpr={MAX_DPR}
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      >
        <PulsarScene settings={settings} />
      </Canvas>
    </Box>
  );
}
