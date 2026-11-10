/**
 * @file Provider preset helpers for OpenAI-compatible generation endpoints.
 * @module lib/generationProviderUtils.ts
 */
// Provider preset helpers (extracted from GenerationTab.tsx).
import { ZEN_BASE_URL } from '@/lib/constants';

export const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export type ProviderPreset = 'custom' | 'openai' | 'zen';

/**
 * Detect the provider preset for a base URL.
 * @param baseURL - The generation base URL, or undefined.
 * @returns 'zen' for OpenCode Zen, 'openai' for api.openai.com, otherwise 'custom'.
 * @see {@link ZEN_BASE_URL}
 */
export function getProviderPreset(baseURL: string | undefined): ProviderPreset {
  const url = (baseURL || '').trim().replace(/\/+$/, '');
  if (url === ZEN_BASE_URL.replace(/\/+$/, '')) return 'zen';
  if (url === OPENAI_BASE_URL.replace(/\/+$/, '')) return 'openai';
  return 'custom';
}

/**
 * Whether a base URL points to a remote (non-localhost) provider.
 * @param baseURL - The generation base URL, or undefined.
 * @returns true when the hostname is neither localhost nor 127.0.0.1, or when
 *   the URL is unparseable (treated as remote to avoid sending keys locally).
 * @see {@link getProviderPreset}
 */
export function isRemoteProvider(baseURL: string | undefined): boolean {
  try {
    const url = baseURL?.trim();
    if (!url) return false;
    const u = new URL(url);
    return u.hostname !== 'localhost' && u.hostname !== '127.0.0.1';
  } catch {
    return false;
  }
}
