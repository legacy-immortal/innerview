/**
 * @file Device capability heuristics for associative-memory embedding compute.
 * @module lib/embedding-capability
 *
 * Cloud-first policy: embeddings are computed server-side by default for a
 * smooth experience (especially on tablets). Client/browser compute is treated
 * as an opt-in/offload path when the device appears capable (e.g. WebGPU +
 * sufficient GPU/memory), and can be disabled to avoid jank or cost.
 */

import type { PerformanceMetrics } from './performance-detector';

export type EmbeddingComputeMode = 'server' | 'client' | 'disabled';

/**
 * Minimum device memory (GB) we'd like to see before considering in-browser
 * embedding offload "comfortable" on tablets. (Heuristic; WebGPU/model size
 * ultimately decide.)
 */
export const PREFERRED_CLIENT_EMBEDDING_MEMORY_GB = 6;

/**
 * Whether the device looks capable of in-browser embedding compute (e.g. via
 * Transformers.js/WebGPU/WASM) without being an obvious jank risk.
 *
 * Heuristic: WebGPU (or strong GPU signal), non-low tier, and not clearly
 * memory-constrained. This does NOT guarantee a model can load; callers must
 * still handle load/compute failures and fall back to server.
 */
export function canComputeEmbeddingsInBrowser(
  metrics: PerformanceMetrics
): boolean {
  if (metrics.tier === 'low') return false;
  if (metrics.gpuTier === 'low') return false;
  if (!metrics.supportsWebGPU && !metrics.supportsWebGL2) return false;
  if (
    metrics.deviceMemory !== undefined &&
    metrics.deviceMemory < PREFERRED_CLIENT_EMBEDDING_MEMORY_GB
  ) {
    return false;
  }
  // WebGPU is the strongest signal for practical local inference; allow a
  // medium/high WebGL2 device as a weaker-but-possible candidate.
  if (metrics.supportsWebGPU) return true;
  return metrics.gpuTier === 'high' && metrics.hardwareConcurrency >= 6;
}

/**
 * Recommend an embedding compute mode given device metrics.
 *
 * - `server` (default): cloud/server computes embeddings in memory and stores
 *   vectors (e.g. in Turso) — smooth baseline for tablets/voice users.
 * - `client`: device appears capable of offloading embedding compute; callers
 *   should still treat this as opt-in/progressive and fall back to `server`.
 * - `disabled`: associative/vector memory offload not advised on this device
 *   and no server path desired by caller (callers may still choose `server`).
 */
export function recommendEmbeddingComputeMode(
  metrics: PerformanceMetrics,
  options?: { allowClientOffload?: boolean; preferCloud?: boolean }
): EmbeddingComputeMode {
  const preferCloud = options?.preferCloud ?? true;
  const allowClientOffload = options?.allowClientOffload ?? false;

  // Cloud-first: keep server as the smooth default unless caller explicitly
  // opts into client offload on a capable device.
  if (preferCloud && !allowClientOffload) return 'server';

  if (allowClientOffload && canComputeEmbeddingsInBrowser(metrics)) {
    return 'client';
  }

  // If cloud/server is acceptable, defer there rather than disabling.
  return 'server';
}
