/**
 * @file Shared types and defaults for the hypnotic background animation.
 * Colors are `[r, g, b]` tuples with channels in [0, 1].
 */

/** Settings describing the hypnotic background layers and motion. */
export interface HypnoticBackgroundSettings {
  readonly intensity: number;
  readonly primaryColor1: readonly [number, number, number];
  readonly primaryColor2: readonly [number, number, number];
  readonly secondaryColor1: readonly [number, number, number];
  readonly secondaryColor2: readonly [number, number, number];
  readonly tertiaryColor1: readonly [number, number, number];
  readonly tertiaryColor2: readonly [number, number, number];
  readonly breathingEnabled: boolean;
  readonly breathingSpeed: number;
  readonly breathingIntensity: number;
  readonly particlesEnabled: boolean;
  readonly particlesCount: number;
  readonly particlesOpacity: number;
  readonly rotationSpeed1: number;
  readonly rotationSpeed2: number;
  readonly rotationSpeed3: number;
}

/** Default settings for the hypnotic background. */
export const DEFAULT_SETTINGS: HypnoticBackgroundSettings = {
  intensity: 0.3,
  primaryColor1: [139 / 255, 92 / 255, 246 / 255],
  primaryColor2: [59 / 255, 130 / 255, 246 / 255],
  secondaryColor1: [99 / 255, 102 / 255, 241 / 255],
  secondaryColor2: [147 / 255, 51 / 255, 234 / 255],
  tertiaryColor1: [236 / 255, 72 / 255, 153 / 255],
  tertiaryColor2: [168 / 255, 85 / 255, 247 / 255],
  breathingEnabled: true,
  breathingSpeed: 0.25,
  breathingIntensity: 0.2,
  particlesEnabled: false,
  particlesCount: 8,
  particlesOpacity: 0.4,
  rotationSpeed1: 0.1256635,
  rotationSpeed2: 0.08976,
  rotationSpeed3: 0.10472,
};
