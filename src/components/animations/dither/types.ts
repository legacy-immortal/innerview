import type * as THREE from 'three';

/**
 * @file Shared types for the dither animation — wave shader uniforms and the
 * props accepted by `DitheredWaves` and the public `Dither` component.
 */

/** Uniform block for the dithered waves shader. */
export interface WaveUniforms {
  readonly [key: string]: THREE.Uniform<number | THREE.Vector2 | THREE.Color>;
  readonly time: THREE.Uniform<number>;
  readonly resolution: THREE.Uniform<THREE.Vector2>;
  readonly waveSpeed: THREE.Uniform<number>;
  readonly waveFrequency: THREE.Uniform<number>;
  readonly waveAmplitude: THREE.Uniform<number>;
  readonly waveColor: THREE.Uniform<THREE.Color>;
  readonly mousePos: THREE.Uniform<THREE.Vector2>;
  readonly enableMouseInteraction: THREE.Uniform<number>;
  readonly mouseRadius: THREE.Uniform<number>;
}

/** Props for the internal `DitheredWaves` scene component. */
export interface DitheredWavesProps {
  readonly waveSpeed: number;
  readonly waveFrequency: number;
  readonly waveAmplitude: number;
  readonly waveColor: readonly [number, number, number];
  readonly colorNum: number;
  readonly pixelSize: number;
  readonly disableAnimation: boolean;
  readonly enableMouseInteraction: boolean;
  readonly mouseRadius: number;
}

/** Props accepted by the public `Dither` component. */
export interface DitherProps {
  readonly waveSpeed?: number;
  readonly waveFrequency?: number;
  readonly waveAmplitude?: number;
  readonly waveColor?: readonly [number, number, number];
  readonly colorNum?: number;
  readonly pixelSize?: number;
  readonly disableAnimation?: boolean;
  readonly enableMouseInteraction?: boolean;
  readonly mouseRadius?: number;
}
