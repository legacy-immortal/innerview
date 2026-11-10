/**
 * @file mobile-detection.ts — Detects mobile/iOS devices from the user agent.
 * @module lib/tts/utils/mobile-detection
 *
 * Mobile device detection utility. Sniffs the user agent so the TTS layer
 * can apply platform-specific workarounds (iOS autoplay, AudioContext
 * initialization on user gesture).
 */

/**
 * Detect if running on a mobile device.
 * Sniffs the user agent (and vendor/opera fallbacks) against known mobile
 * platform patterns. Returns false outside the browser (e.g. tests, SSR).
 * @returns True when the user agent matches a mobile platform.
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check user agent with vendor/opera fallbacks for older mobile browsers
  const userAgent =
    navigator.userAgent ||
    navigator.vendor ||
    ((window as typeof window & { opera?: string }).opera || '');

  // Mobile device patterns matched case-insensitively
  const mobilePatterns = [
    /android/i,
    /webos/i,
    /iphone/i,
    /ipad/i,
    /ipod/i,
    /blackberry/i,
    /windows phone/i,
  ];

  return mobilePatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Detect if running on iOS.
 * Excludes MSStream (IE on Windows Phone) which can report an iPad-like UA.
 * @returns True when the user agent is iPad/iPhone/iPod and not MSStream.
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent =
    navigator.userAgent ||
    navigator.vendor ||
    ((window as typeof window & { opera?: string }).opera || '');
  return (
    /iPad|iPhone|iPod/.test(userAgent) &&
    !(window as typeof window & { MSStream?: unknown }).MSStream
  );
}

