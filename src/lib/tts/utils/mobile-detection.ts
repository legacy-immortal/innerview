// Mobile device detection utility

/**
 * Detect if running on a mobile device
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check user agent
  const userAgent =
    navigator.userAgent ||
    navigator.vendor ||
    ((window as typeof window & { opera?: string }).opera || '');

  // Mobile device patterns
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
 * Detect if running on iOS
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

