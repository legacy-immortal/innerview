#!/usr/bin/env bun
/**
 * Midscene e2e sentinel: selects a suitable vision-capable remote VLLM model
 * from NVIDIA NIM (OpenAI-compatible /v1/models) and updates e2e/.env before tests.
 *
 * Behavior (by design): FAIL FAST if no capable remote VLLM can be found/selected.
 * We do not run local VLLMs for these agentic tests (insufficient/unsafe compute
 * consistency) and we do not silently fall back to an unknown/unverified model.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '.env');
const NIM_BASE = 'https://integrate.api.nvidia.com/v1';

/** Heuristic preference for vision-capable models usable with Midscene UI tasks. */
const VISION_HINTS: readonly string[] = [
  'nemotron-3.5-super-vl',
  'nemotron-3-super-vl',
  'llama-3.2-90b-vision',
  'llama-3.2-11b-vision',
  'phi-3-vision',
  'phi-3.5-vision',
  'cosmos-reason',
  'vila',
  'neva',
  'paligemma',
  'gemma-3',
  'gemma-4',
];

interface NIMModel {
  id?: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

interface NIMModelsResponse {
  object?: string;
  data?: NIMModel[];
}

function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function upsertEnv(content: string, updates: Record<string, string>): string {
  let next = content || '';
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(next)) {
      next = next.replace(re, line);
    } else {
      if (next.length && !next.endsWith('\n')) next += '\n';
      next += line + '\n';
    }
  }
  return next;
}

function pickLatestFreeVisionModel(models: NIMModel[]): string | null {
  const ids = models
    .map((m) => (m && typeof m.id === 'string' ? m.id : null))
    .filter((id): id is string => Boolean(id));

  const vision = ids.filter((id) => {
    const lower = id.toLowerCase();
    return (
      lower.includes('vision') ||
      lower.includes('-vl') ||
      lower.includes('/neva') ||
      lower.includes('/vila') ||
      lower.includes('cosmos-reason') ||
      VISION_HINTS.some((h) => lower.includes(h))
    );
  });

  for (const hint of VISION_HINTS) {
    const match = vision.find((id) => id.toLowerCase().includes(hint));
    if (match) return match;
  }
  if (vision.length > 0) return vision[0];
  return null;
}

function fail(reason: string): never {
  console.error(`[midscene-sentinel] FATAL: ${reason}`);
  console.error(
    '[midscene-sentinel] Agentic e2e requires a capable remote VLLM (NVIDIA NIM). Local VLLM execution is not supported for consistent/safe test runs. Provide NVIDIA_NIM_API_KEY (or MIDSCENE_MODEL_API_KEY) and ensure a vision-capable model is available, or set E2E_REQUIRE_REMOTE_VLLM=0 only for explicit non-agentic dry runs.'
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const requireRemote = (process.env.E2E_REQUIRE_REMOTE_VLLM ?? '1') !== '0';

  let fileEnv: Record<string, string> = {};
  let original = '';
  if (fs.existsSync(ENV_PATH)) {
    original = fs.readFileSync(ENV_PATH, 'utf8');
    fileEnv = parseEnv(original);
  }

  const apiKey =
    process.env.NVIDIA_NIM_API_KEY ||
    process.env.MIDSCENE_MODEL_API_KEY ||
    fileEnv.NVIDIA_NIM_API_KEY ||
    fileEnv.MIDSCENE_MODEL_API_KEY;

  const baseUrl =
    process.env.MIDSCENE_MODEL_BASE_URL ||
    fileEnv.MIDSCENE_MODEL_BASE_URL ||
    NIM_BASE;

  if (!apiKey || apiKey === 'your_nvidia_nim_api_key_here') {
    if (requireRemote) {
      fail(
        'No NVIDIA_NIM_API_KEY/MIDSCENE_MODEL_API_KEY configured; cannot select a capable remote VLLM for agentic tests.'
      );
    }
    console.warn(
      '[midscene-sentinel] Remote VLLM not required (E2E_REQUIRE_REMOTE_VLLM=0); keeping existing model config.'
    );
    return;
  }

  let selected: string | null = null;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`models request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as NIMModelsResponse;
    const list = Array.isArray(data?.data) ? data.data : [];
    selected = pickLatestFreeVisionModel(list);
  } catch (err) {
    if (requireRemote) {
      fail(
        `Failed to discover/select a capable remote VLLM from ${baseUrl}: ${String(err)}`
      );
    }
    console.warn(
      `[midscene-sentinel] Remote VLLM discovery failed but not required: ${String(err)}`
    );
    return;
  }

  if (!selected) {
    if (requireRemote) {
      fail(
        `No suitable vision-capable VLLM found at ${baseUrl} for agentic UI tests.`
      );
    }
    console.warn(
      '[midscene-sentinel] No suitable vision-capable model found; remote VLLM not required, keeping existing config.'
    );
    return;
  }

  const updates: Record<string, string> = {
    MIDSCENE_MODEL_BASE_URL: baseUrl,
    MIDSCENE_MODEL_NAME: selected,
    MIDSCENE_MODEL_API_KEY: apiKey,
  };

  const next = upsertEnv(original, updates);
  fs.writeFileSync(ENV_PATH, next, 'utf8');
  console.log(`[midscene-sentinel] Selected model: ${selected}`);
}

main();
