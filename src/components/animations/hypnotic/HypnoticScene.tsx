import type { ReactElement } from 'react';
import type { HypnoticBackgroundSettings } from './types';
import {
  EnergyWaveLayer,
  GeometricPatternLayer,
  GradientLayer,
  ScanLinesLayer,
} from './layers';
import { Particles } from './Particles';
import {
  PRIMARY_GRADIENT_FRAGMENT,
  SECONDARY_GRADIENT_FRAGMENT,
  TERTIARY_GRADIENT_FRAGMENT,
} from './shaders';
import { useThrottledFrames, RENDER_COUNTER } from '../perf';
import { useFrame } from '@react-three/fiber';

/**
 * @file Hypnotic background scene — composes the gradient layers, particles,
 * geometric pattern, energy wave, and scanlines for the hypnotic settings.
 */

/** Props for the hypnotic scene. */
interface HypnoticSceneProps {
  readonly settings: HypnoticBackgroundSettings;
}

/**
 * Render the hypnotic background scene from its settings.
 * @param props - The hypnotic background settings.
 * @returns The composed scene fragment.
 */
export function HypnoticScene({ settings }: HypnoticSceneProps): ReactElement {
  // Demand-mode canvas renders at ~30 fps instead of every vsync.
  useThrottledFrames();
  useFrame(() => {
    RENDER_COUNTER.frames += 1;
  });
  return (
    <>
      <GradientLayer
        fragmentShader={PRIMARY_GRADIENT_FRAGMENT}
        color1={settings.primaryColor1}
        color2={settings.primaryColor2}
        scale={2}
        zIndex={0.3}
        intensity={settings.intensity}
        breathingEnabled={settings.breathingEnabled}
        breathingSpeed={settings.breathingSpeed}
        breathingIntensity={settings.breathingIntensity}
        rotationSpeed={settings.rotationSpeed1}
      />
      <GradientLayer
        fragmentShader={SECONDARY_GRADIENT_FRAGMENT}
        color1={settings.secondaryColor1}
        color2={settings.secondaryColor2}
        scale={1.8}
        zIndex={0.2}
        intensity={settings.intensity}
        breathingEnabled={settings.breathingEnabled}
        breathingSpeed={settings.breathingSpeed}
        breathingIntensity={settings.breathingIntensity}
        rotationSpeed={settings.rotationSpeed2}
      />
      <GradientLayer
        fragmentShader={TERTIARY_GRADIENT_FRAGMENT}
        color1={settings.tertiaryColor1}
        color2={settings.tertiaryColor2}
        scale={1.2}
        zIndex={0.1}
        intensity={settings.intensity}
        breathingEnabled={settings.breathingEnabled}
        breathingSpeed={settings.breathingSpeed}
        breathingIntensity={settings.breathingIntensity}
        rotationSpeed={settings.rotationSpeed3}
      />
      <Particles
        enabled={settings.particlesEnabled}
        count={settings.particlesCount}
        opacity={settings.particlesOpacity}
      />
      <GeometricPatternLayer />
      <EnergyWaveLayer
        color1={settings.tertiaryColor1}
        color2={settings.tertiaryColor2}
      />
      <ScanLinesLayer />
    </>
  );
}
