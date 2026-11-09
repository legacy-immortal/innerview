/**
 * @file System text animation helpers — defaults and builders for the
 * appear/hold/fade-out CSS keyframes used by system text announcements.
 */

import type { SystemTextAnimationSettings } from '@/lib/settings-types';

/** Default appear/hold/fade durations for the system text animation. */
export const DEFAULT_SYSTEM_TEXT: SystemTextAnimationSettings = {
  appearDurationMs: 150,
  holdDurationS: 2.5,
  fadeOutDurationS: 3,
};

/** Milliseconds per second. */
const MS_PER_SECOND = 1000;

/** Milliseconds per percentage point of the keyframe timeline. */
const PERCENTAGE_TO_MS = 100;

/**
 * Compute the total animation duration in milliseconds.
 * @param opts - Timing settings for the three animation phases.
 * @returns The total duration in milliseconds.
 */
function totalDurationMs(opts: SystemTextAnimationSettings): number {
  return (
    opts.appearDurationMs +
    opts.holdDurationS * MS_PER_SECOND +
    opts.fadeOutDurationS * MS_PER_SECOND
  );
}

/**
 * Build the opacity keyframes for the system text animation.
 * @param opts - Timing settings for the three animation phases.
 * @returns Keyframe map from percentage to opacity.
 */
export function systemTextKeyframes(
  opts: SystemTextAnimationSettings
): Record<string, { opacity: number }> {
  const totalMs = totalDurationMs(opts);
  const appearPercent = (opts.appearDurationMs / totalMs) * PERCENTAGE_TO_MS;
  const holdEndPercent =
    ((opts.appearDurationMs + opts.holdDurationS * MS_PER_SECOND) / totalMs) *
    PERCENTAGE_TO_MS;
  return {
    '0%': { opacity: 0 },
    [`${appearPercent}%`]: { opacity: 1 },
    [`${holdEndPercent}%`]: { opacity: 1 },
    '100%': { opacity: 0 },
  };
}

/**
 * Build the CSS animation declaration and keyframes for the system text.
 * @param opts - Timing settings for the three animation phases.
 * @param keyframesName - Name of the `@keyframes` rule to declare.
 * @returns A CSS-in-JS object with the animation and keyframes.
 */
export function systemTextAnimationCss(
  opts: SystemTextAnimationSettings,
  keyframesName: string
): Record<string, string | Record<string, { opacity: number }>> {
  const durationS = totalDurationMs(opts) / MS_PER_SECOND;
  return {
    animation: `${keyframesName} ${durationS}s linear`,
    [`@keyframes ${keyframesName}`]: systemTextKeyframes(opts),
  };
}
