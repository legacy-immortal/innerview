/**
 * @file Client helper for opt-in, installation-scoped remote memory API.
 * @module lib/memory-client
 *
 * All remote memory operations require explicit user opt-in and an anonymous
 * installation id. This module centralizes consent/scoping checks so callers
 * cannot accidentally perform remote persistence without opt-in.
 */

import { apiUrl } from '@/lib/api-base';
import { useSettingsStore } from '@/lib/settings-store';

export interface MemoryDocument {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MemorySearchResult {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryOperationResult {
  ok: boolean;
  status?: number;
  error?: string;
  [key: string]: unknown;
}

function getRemoteMemoryContext(): {
  allowed: boolean;
  installationId?: string;
  reason?: string;
} {
  const privacy = useSettingsStore.getState().getPrivacySettings();
  if (!privacy?.associativeMemoryRemote) {
    return {
      allowed: false,
      reason: 'Remote associative memory is disabled (opt-in required).',
    };
  }
  const installationId = privacy.installationId;
  if (!installationId) {
    return {
      allowed: false,
      reason: 'Missing installation id; save privacy settings to generate one.',
    };
  }
  return { allowed: true, installationId };
}

async function postMemory<T extends MemoryOperationResult>(
  path: string,
  payload: Record<string, unknown>
): Promise<T> {
  try {
    const res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error:
          typeof data.error === 'string'
            ? data.error
            : `Request failed (${res.status})`,
        ...data,
      } as T;
    }
    return { ok: true, status: res.status, ...data } as T;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as T;
  }
}

/** Add documents to remote associative memory when opted-in and scoped. */
export async function addRemoteMemoryDocuments(
  documents: MemoryDocument[]
): Promise<MemoryOperationResult & { added?: number; count?: number }> {
  const ctx = getRemoteMemoryContext();
  if (!ctx.allowed || !ctx.installationId) {
    return { ok: false, error: ctx.reason };
  }
  return postMemory('/api/memory/add', {
    installationId: ctx.installationId,
    optIn: true,
    documents,
  });
}

/** Search remote associative memory when opted-in and scoped. */
export async function searchRemoteMemory(params: {
  query?: string;
  embedding?: number[];
  k?: number;
}): Promise<MemoryOperationResult & { results?: MemorySearchResult[] }> {
  const ctx = getRemoteMemoryContext();
  if (!ctx.allowed || !ctx.installationId) {
    return { ok: false, error: ctx.reason };
  }
  return postMemory('/api/memory/search', {
    installationId: ctx.installationId,
    optIn: true,
    ...params,
  });
}

/** Count remote associative memory documents when opted-in and scoped. */
export async function countRemoteMemory(): Promise<
  MemoryOperationResult & { count?: number }
> {
  const ctx = getRemoteMemoryContext();
  if (!ctx.allowed || !ctx.installationId) {
    return { ok: false, error: ctx.reason };
  }
  return postMemory('/api/memory/count', {
    installationId: ctx.installationId,
    optIn: true,
  });
}

/** Delete all remote associative memory documents for this installation. */
export async function deleteRemoteMemory(): Promise<MemoryOperationResult> {
  const ctx = getRemoteMemoryContext();
  if (!ctx.allowed || !ctx.installationId) {
    return { ok: false, error: ctx.reason };
  }
  return postMemory('/api/memory/delete', {
    installationId: ctx.installationId,
    optIn: true,
  });
}

/** Export remote associative memory documents for this installation. */
export async function exportRemoteMemory(): Promise<
  MemoryOperationResult & { documents?: MemoryDocument[]; count?: number }
> {
  const ctx = getRemoteMemoryContext();
  if (!ctx.allowed || !ctx.installationId) {
    return { ok: false, error: ctx.reason };
  }
  return postMemory('/api/memory/export', {
    installationId: ctx.installationId,
    optIn: true,
  });
}

/** Whether remote associative memory operations are currently allowed. */
export function canUseRemoteMemory(): boolean {
  return getRemoteMemoryContext().allowed;
}
