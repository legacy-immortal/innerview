import type { SystemTextAnimationSettings } from '@/lib/settings-types';

export const DEFAULT_SYSTEM_TEXT: SystemTextAnimationSettings = {
  appearDurationMs: 150,
  holdDurationS: 2.5,
  fadeOutDurationS: 3,
};

export function systemTextKeyframes(
  opts: SystemTextAnimationSettings
): Record<string, { opacity: number }> {
  const totalMs =
    opts.appearDurationMs +
    opts.holdDurationS * 1000 +
    opts.fadeOutDurationS * 1000;
  const p1 = (opts.appearDurationMs / totalMs) * 100;
  const p2 =
    ((opts.appearDurationMs + opts.holdDurationS * 1000) / totalMs) * 100;
  return {
    '0%': { opacity: 0 },
    [`${p1}%`]: { opacity: 1 },
    [`${p2}%`]: { opacity: 1 },
    '100%': { opacity: 0 },
  };
}

export function systemTextAnimationCss(
  opts: SystemTextAnimationSettings,
  keyframesName: string
): Record<string, string | Record<string, { opacity: number }>> {
  const totalMs =
    opts.appearDurationMs +
    opts.holdDurationS * 1000 +
    opts.fadeOutDurationS * 1000;
  const durationS = totalMs / 1000;
  return {
    animation: `${keyframesName} ${durationS}s linear`,
    [`@keyframes ${keyframesName}`]: systemTextKeyframes(opts),
  };
}
