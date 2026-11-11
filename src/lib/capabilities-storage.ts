/**
 * @file localStorage persistence for the bootstrap capabilities confirmation.
 * @module lib/capabilities-storage.ts
 */
// Persists whether the user has reviewed/confirmed the announced
// capabilities (recommended settings) so the dialog is not shown on
// every launch.

const STORAGE_KEY = 'innerview.capabilitiesConfirmed';

/**
 * Read the stored capabilities-confirmation flag.
 * @returns `true` if the user confirmed the capabilities dialog.
 */
export function getCapabilitiesConfirmed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persist the capabilities-confirmation flag.
 */
export function setCapabilitiesConfirmed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

/**
 * Clear the capabilities-confirmation flag (used when resetting settings).
 */
export function clearCapabilitiesConfirmed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
