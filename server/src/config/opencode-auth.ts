import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface OpenCodeAuthEntry {
  readonly type?: string;
  readonly key?: string;
  readonly access?: string;
  readonly refresh?: string;
  readonly [k: string]: unknown;
}

export type OpenCodeAuthFile = Record<string, OpenCodeAuthEntry>;

function resolveDataDir(): string {
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg && xdg.trim()) return join(xdg.trim(), 'opencode');
  return join(homedir(), '.local', 'share', 'opencode');
}

let cached: OpenCodeAuthFile | null | undefined;

/**
 * Read opencode credentials from the same location the opencode SDK/CLI uses:
 * $XDG_DATA_HOME/opencode/auth.json or ~/.local/share/opencode/auth.json.
 * Results are cached for the process lifetime. Missing/invalid files return null.
 */
export function readOpenCodeAuth(): OpenCodeAuthFile | null {
  if (cached !== undefined) return cached;
  try {
    const file = join(resolveDataDir(), 'auth.json');
    const raw = readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      cached = null;
      return null;
    }
    cached = parsed as OpenCodeAuthFile;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

/** Clear cached auth (tests/reload). */
export function resetOpenCodeAuthCache(): void {
  cached = undefined;
}

function credentialFromEntry(
  entry: OpenCodeAuthEntry | undefined
): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  if (typeof entry.key === 'string' && entry.key.trim())
    return entry.key.trim();
  if (typeof entry.access === 'string' && entry.access.trim())
    return entry.access.trim();
  return undefined;
}

/** Get a credential for an exact opencode provider id. */
export function getOpenCodeProviderKey(providerId: string): string | undefined {
  const auth = readOpenCodeAuth();
  if (!auth) return undefined;
  return credentialFromEntry(auth[providerId]);
}

/**
 * Resolve an API key using opencode auth as a fallback source.
 * Tries provider ids in order and returns the first credential found.
 */
export function resolveOpenCodeApiKey(
  providerIds: string[]
): string | undefined {
  for (const id of providerIds) {
    const key = getOpenCodeProviderKey(id);
    if (key) return key;
  }
  return undefined;
}
