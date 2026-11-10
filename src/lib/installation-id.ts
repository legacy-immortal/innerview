/**
 * @file Anonymous, device-local installation identity (no sign-in).
 * @module lib/installation-id
 *
 * Used to scope opt-in remote persistence/vector memory per installation/profile
 * without requiring user accounts. Treat as an opaque identifier, not auth.
 */

const STORAGE_KEY = 'innerview.installationId';

function randomId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Get or create the stable anonymous installation id for this browser/profile. */
export function getOrCreateInstallationId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.trim()) return existing;
    const id = randomId();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Storage unavailable (private mode/quota); fall back to ephemeral id.
    return randomId();
  }
}

/** Read installation id without creating one (returns null if unset/unavailable). */
export function getInstallationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    return existing && existing.trim() ? existing : null;
  } catch {
    return null;
  }
}
