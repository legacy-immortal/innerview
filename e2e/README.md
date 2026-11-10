# e2e (Midscene + Playwright + NVIDIA NIM)

AI-driven end-to-end tests using [Midscene](https://midscenejs.com/) with Playwright, configured for a free/vision-capable VLLM via **NVIDIA NIM** (OpenAI-compatible API). Kept separate from deterministic Vitest tests.

## Setup

1. Install dependencies (from repo root):
   - `bun add -d @midscene/web @playwright/test dotenv`
   - Install browsers: `bunx playwright install chromium`
2. Configure env:
   - Copy `e2e/.env.example` to `e2e/.env`
   - Set `NVIDIA_NIM_API_KEY` (your NVIDIA NIM API key). Do **not** commit `e2e/.env`.
   - Adjust `MIDSCENE_MODEL_NAME` / `MIDSCENE_MODEL_FAMILY` if needed for your chosen model.
3. (Optional) Verify model connectivity:
   - `bunx @midscene/test@latest model verify` (with env loaded)

## Sentinel (latest free model swap)

`scripts`/pre-test flow runs `e2e/sentinel.mjs` before each e2e run:
- Queries `${MIDSCENE_MODEL_BASE_URL:-https://integrate.api.nvidia.com/v1}/models` using your key
- Picks a suitable vision-capable model (heuristic, preferring newer VL models like Nemotron VL)
- Updates `e2e/.env` (`MIDSCENE_MODEL_NAME`, `MIDSCENE_MODEL_API_KEY`, `MIDSCENE_MODEL_BASE_URL`)

If the key is missing or the lookup fails, it keeps the existing config (non-fatal).

## Run

- `bun run test:e2e` — runs sentinel then Playwright tests in `e2e/`
- `bunx playwright test --config=e2e/playwright.config.ts` — run directly (ensure env/sentinel as needed)

Reports: Midscene Playwright reporter outputs under `midscene_run/report/` by default.
