# e2e (Midscene + Playwright + NVIDIA NIM)

Browser/e2e tests split into two lanes so **frontend verification is automated and not purely operator-dependent**:

- **UI/perf lane (non-agentic, always runnable):** Playwright checks with console/error capture, navigation timing, CDP performance metrics, and **parameterized performance budgets** (tests fail when budgets exceeded). No AI/VLLM required.
- **Agentic lane (Midscene AI):** vision-driven UI actions/assertions via Midscene. Requires a **capable remote VLLM**.

> Local VLLM execution is intentionally unsupported for consistent/safe agentic runs. The sentinel **fails fast** if no capable remote VLLM can be discovered/selected.

## Setup

1. Install dependencies (from repo root): `bun install` (includes `@midscene/web`, `@playwright/test`, `dotenv`).
2. Install browser once: `bunx playwright install chromium`.
3. For **agentic** tests, copy `e2e/.env.example` to `e2e/.env` and set `NVIDIA_NIM_API_KEY` (never commit `e2e/.env`). Adjust `MIDSCENE_MODEL_NAME` / `MIDSCENE_MODEL_FAMILY` if needed.

## Sentinel behavior (remote VLLM required for agentic tests)

`e2e/sentinel.mjs` runs before agentic tests:
- Queries `${MIDSCENE_MODEL_BASE_URL:-https://integrate.api.nvidia.com/v1}/models` with your key.
- Selects a suitable **vision-capable** remote VLLM (heuristic, preferring newer VL models).
- Updates `e2e/.env` (`MIDSCENE_MODEL_NAME`, `MIDSCENE_MODEL_API_KEY`, `MIDSCENE_MODEL_BASE_URL`).
- **Fail-fast (default, `E2E_REQUIRE_REMOTE_VLLM=1`):** exits non-zero if key is missing, model discovery fails, or no capable vision-capable VLLM is found. No local VLLM fallback.
- **Explicit dry/non-agentic override:** `E2E_REQUIRE_REMOTE_VLLM=0` allows sentinel to skip without failing (no AI model provisioned).

## Run

- `bun run test:e2e:ui` — **UI/perf lane** (no VLLM/AI). Collects console + page errors + navigation/CDP performance metrics and enforces budgets.
- `bun run test:e2e` — **agentic lane** (sentinel + Midscene). Requires capable remote VLLM; fails fast if unavailable.
- `bun run test:e2e:all` — run UI/perf lane then agentic lane (agentic still requires VLLM).
- Dry sentinel (non-agentic): `E2E_REQUIRE_REMOTE_VLLM=0 bun run test:e2e:sentinel`

Reports: Midscene Playwright reporter outputs under `midscene_run/report/` (gitignored). UI/perf runs attach console/perf JSON to Playwright results.

## Debugging & performance instrumentation

UI/perf tests (`e2e/*.ui.spec.ts`) capture and emit:
- **Console logs** (all levels) and **page errors** (uncaught exceptions)
- **Navigation timing** (response, DOMContentLoaded, load, transfer size) and **CDP Performance metrics** (e.g. `ScriptDuration`, `TaskDuration`, `LayoutCount`, `RecalcStyleCount`, JS heap)
- Results attached per test as `console-logs`, `page-errors`, `performance-metrics` and printed on failure.

## Parameterized performance budgets

Threshold env vars (see `e2e/.env.example`): `E2E_PERF_MAX_LOAD_MS`, `E2E_PERF_MAX_DCL_MS`, `E2E_PERF_MAX_RESPONSE_MS`, `E2E_PERF_MAX_SCRIPT_DURATION_MS`, `E2E_PERF_MAX_TASK_DURATION_MS`, `E2E_PERF_MAX_LAYOUT_COUNT`, `E2E_PERF_MAX_CONSOLE_ERRORS`, `E2E_PERF_MAX_PAGE_ERRORS`. Tests **fail** when measured values exceed configured budgets.
