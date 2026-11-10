/**
 * @file API base URL resolution for split deployments.
 * @module lib/api-base
 *
 * Defaults to same-origin relative `/api` paths when VITE_API_BASE_URL is unset.
 * Set VITE_API_BASE_URL (e.g. https://api.example.com) to target a separate API host.
 */

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

/** API origin/base (no trailing slash), or empty string for same-origin relative paths. */
export const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

/**
 * Build an API URL for a path like `/api/chat`.
 * If a base is configured and path is relative, joins them; absolute URLs pass through.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
