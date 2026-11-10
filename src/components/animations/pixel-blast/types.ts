import type React from 'react';
import type { Effect } from 'postprocessing';

/**
 * @file Shared types for the pixel-blast animation — variant union, props,
 * and the narrow helper interface used to reach an EffectPass's effects.
 */

/**
 * Narrow shape for an `EffectPass` whose private `effects` list is needed.
 * Read through {@link isEffectPassWithEffects} rather than casting.
 */
export interface EffectPassWithEffects {
  readonly effects: Effect[];
}

/**
 * Type guard for {@link EffectPassWithEffects}. Narrows an `unknown` value to
 * the shape exposing a readable `effects` array.
 * @param value - The value to narrow.
 * @returns True when the value has a readable `effects` array.
 */
export function isEffectPassWithEffects(
  value: unknown
): value is EffectPassWithEffects {
  return (
    typeof value === 'object' &&
    value !== null &&
    'effects' in value &&
    Array.isArray((value as { effects: unknown }).effects)
  );
}

/** Visual variant for pixel-blast rendering. */
export type PixelBlastVariant = 'square' | 'circle' | 'triangle' | 'diamond';

/** Props accepted by the `PixelBlast` component and its renderer hook. */
export interface PixelBlastProps {
  readonly variant?: PixelBlastVariant;
  readonly pixelSize?: number;
  readonly color?: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly antialias?: boolean;
  readonly patternScale?: number;
  readonly patternDensity?: number;
  readonly liquid?: boolean;
  readonly liquidStrength?: number;
  readonly liquidRadius?: number;
  readonly pixelSizeJitter?: number;
  readonly enableRipples?: boolean;
  readonly rippleIntensityScale?: number;
  readonly rippleThickness?: number;
  readonly rippleSpeed?: number;
  readonly liquidWobbleSpeed?: number;
  readonly autoPauseOffscreen?: boolean;
  readonly speed?: number;
  readonly transparent?: boolean;
  readonly edgeFade?: number;
  readonly noiseAmount?: number;
}
