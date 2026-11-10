/**
 * @file systemTextAnimation.ts — defaults and builders for system text
 * appear/hold/fade-out CSS keyframes.
 * @module components/animations/systemTextAnimation
 *
 * Defines the default timing for system text announcements and builds the
 * opacity keyframes and CSS-in-JS animation declaration used by the system
 * text label in `CircularVisualization`. `forwards` fill mode is used so
 * faded-out text stays hidden after the animation ends.
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
    // `forwards` holds the final keyframe (opacity: 0). Without it the
    // animation snaps back to the element's natural opacity (1) when it
    // ends, so faded-out system text reappears and stays visible.
    animation: `${keyframesName} ${durationS}s linear forwards`,
    [`@keyframes ${keyframesName}`]: systemTextKeyframes(opts),
  };
}
