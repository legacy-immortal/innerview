/**
 * @file localStorage persistence for disclaimer acceptance and a console-exposed settings reset.
 * @module lib/disclaimer-storage.ts
 */
// Persists disclaimer acceptance in localStorage so the user is not prompted on refresh

const STORAGE_KEY = 'innerview.disclaimerAccepted';

/**
 * Read the stored disclaimer acceptance flag.
 * @returns `true` if the user accepted the disclaimer, `false` otherwise
 *   (including when localStorage is unavailable).
 */
export function getDisclaimerAccepted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persist the disclaimer acceptance flag so the user is not re-prompted.
 * @returns Nothing.
 */
export function setDisclaimerAccepted(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

/**
 * Clear all cached settings to force fresh initialization
 * Useful for testing or resetting the app state
 * Call from browser console: clearAllSettings()
 */
export function clearAllSettings(): void {
  if (typeof window === 'undefined') return;
  try {
    // Clear disclaimer
    localStorage.removeItem(STORAGE_KEY);
    // Clear settings store (zustand persist key)
    localStorage.removeItem('innerview-settings');
    console.log('All settings cleared. Refresh the page to re-initialize.');
  } catch (error) {
    console.error('Failed to clear settings:', error);
  }
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (
    window as unknown as { clearAllSettings: typeof clearAllSettings }
  ).clearAllSettings = clearAllSettings;
}
