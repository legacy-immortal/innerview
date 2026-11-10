#!/usr/bin/env node
/**
 * Midscene e2e sentinel: selects the latest suitable free/vision-capable model
 * from NVIDIA NIM (OpenAI-compatible /v1/models) and updates e2e/.env before tests.
 *
 * - Reads e2e/.env (if present) without overriding existing process env.
 * - Uses NVIDIA_NIM_API_KEY (or MIDSCENE_MODEL_API_KEY) for the models request.
 * - Writes/updates MIDSCENE_MODEL_NAME and ensures MIDSCENE_MODEL_API_KEY/BASE_URL.
 * - Falls back to the existing configured model on any failure (non-fatal).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '.env');
const NIM_BASE = 'https://integrate.api.nvidia.com/v1';

/** Heuristic preference for vision-capable models usable with Midscene UI tasks. */
const VISION_HINTS = [
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

function parseEnv(content) {
  const out = {};
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

function upsertEnv(content, updates) {
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

function pickLatestFreeVisionModel(models) {
  const ids = models
    .map((m) => (m && typeof m.id === 'string' ? m.id : null))
    .filter(Boolean);

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

  // Prefer by curated hint order (newer/better VL first), then stable fallback.
  for (const hint of VISION_HINTS) {
    const match = vision.find((id) => id.toLowerCase().includes(hint));
    if (match) return match;
  }
  if (vision.length > 0) return vision[0];
  // Last resort: keep environment/default choice.
  return null;
}

async function main() {
  let fileEnv = {};
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
    console.warn(
      '[midscene-sentinel] No NVIDIA_NIM_API_KEY/MIDSCENE_MODEL_API_KEY set; keeping existing model config.'
    );
    return;
  }

  let selected = null;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`models request failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    selected = pickLatestFreeVisionModel(list);
  } catch (err) {
    console.warn(
      `[midscene-sentinel] Failed to fetch/select model, keeping existing config: ${String(err)}`
    );
    return;
  }

  if (!selected) {
    console.warn(
      '[midscene-sentinel] No suitable vision-capable model found; keeping existing config.'
    );
    return;
  }

  const updates = {
    MIDSCENE_MODEL_BASE_URL: baseUrl,
    MIDSCENE_MODEL_NAME: selected,
    MIDSCENE_MODEL_API_KEY: apiKey,
  };

  // Ensure e2e/.env exists/updated for dotenv-loaded test runs.
  const next = upsertEnv(original, updates);
  fs.writeFileSync(ENV_PATH, next, 'utf8');
  console.log(`[midscene-sentinel] Selected model: ${selected}`);
}

main();
