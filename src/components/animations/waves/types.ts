import type { CSSProperties } from 'react';

/**
 * @file Shared types for the waves animation — point/mouse simulation state
 * and the props accepted by the `Waves` component and `useWaves` hook.
 */

/**
 * A single simulation point with its wave displacement and cursor state.
 * Mutable by design: the waves renderer integrates these in place each frame.
 */
export interface Point {
  x: number;
  y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number; vx: number; vy: number };
}

/**
 * Mouse tracking state used for cursor interaction.
 * Mutable by design: updated from pointer events and decayed per frame.
 */
export interface Mouse {
  x: number;
  y: number;
  lx: number;
  ly: number;
  sx: number;
  sy: number;
  v: number;
  vs: number;
  a: number;
  set: boolean;
}

/** Simulation configuration for the waves animation. */
export interface Config {
  readonly lineColor: string;
  readonly waveSpeedX: number;
  readonly waveSpeedY: number;
  readonly waveAmpX: number;
  readonly waveAmpY: number;
  readonly friction: number;
  readonly tension: number;
  readonly maxCursorMove: number;
  readonly xGap: number;
  readonly yGap: number;
}

/** Props accepted by the `Waves` component and the `useWaves` hook. */
export interface WavesProps {
  readonly lineColor?: string;
  readonly backgroundColor?: string;
  readonly waveSpeedX?: number;
  readonly waveSpeedY?: number;
  readonly waveAmpX?: number;
  readonly waveAmpY?: number;
  readonly xGap?: number;
  readonly yGap?: number;
  readonly friction?: number;
  readonly tension?: number;
  readonly maxCursorMove?: number;
  readonly enableMouseInteraction?: boolean;
  readonly reverseX?: boolean;
  readonly reverseY?: boolean;
  readonly style?: CSSProperties;
  readonly className?: string;
}
