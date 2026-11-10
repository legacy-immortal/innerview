/**
 * @file localStorage persistence for the Kokoro/Whisper model preload opt-in.
 * @module lib/model-preload-opt-in-storage
 */
// Persists the user's model preload opt-in choice so overburdened devices are
// asked once, then remembered. Mirrors the disclaimer-storage pattern.

/** localStorage key for the preload opt-in choice. */
const STORAGE_KEY = 'innerview.modelPreloadOptIn';

/**
 * Read the stored preload choice.
 * @returns `true`/`false` once the user has decided, `null` if undecided
 *   (or localStorage is unavailable).
 */
export function getModelPreloadOptIn(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the user's preload choice.
 * @param optedIn - Whether the user agreed to preload Kokoro/Whisper.
 * @returns Nothing.
 */
export function setModelPreloadOptInStored(optedIn: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, optedIn ? 'true' : 'false');
  } catch {
    // ignore
  }
}
