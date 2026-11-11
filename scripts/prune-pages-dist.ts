#!/usr/bin/env bun
/**
 * Prune Cloudflare Pages dist artifacts that exceed Pages file size limits.
 * Cloudflare Pages direct uploads reject files > 25 MiB.
 *
 * Currently removes oversized ONNX Runtime WASM assets (client-side/local
 * inference fallback) from dist so the SPA can deploy. Server/cloud-first
 * compute remains the default path.
 */
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = 'dist';
const MAX_BYTES = 25 * 1024 * 1024;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

try {
  const files = walk(DIST_DIR);
  let removed = 0;
  for (const file of files) {
    const size = statSync(file).size;
    if (size > MAX_BYTES) {
      unlinkSync(file);
      removed++;
      console.log(
        `[prune-pages-dist] removed oversized file (${(size / (1024 * 1024)).toFixed(2)} MiB): ${file}`
      );
    }
  }
  if (removed === 0) {
    console.log('[prune-pages-dist] no oversized files found');
  } else {
    console.log(`[prune-pages-dist] removed ${removed} oversized file(s)`);
  }
} catch (err) {
  console.error(
    `[prune-pages-dist] ${err instanceof Error ? err.message : String(err)}`
  );
  process.exit(1);
}
