# Deployment

Targets a split, cloud-first setup for weak/tablet clients: **static web + long-running API + managed DB**.

## Chosen split (recommended, compatible now)

| Layer                                | Where                           | Why                                                                                                                                                                        |
| ------------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web (SPA)**                        | **Cloudflare Pages**            | Global static CDN; Vite build output. (Netlify also works — `netlify.toml` included.)                                                                                      |
| **API**                              | **Render** (Docker web service) | Long-running Bun/Hono server: streaming, server-side embeddings/model init/download/cache, in-process state. Not drop-in for edge/serverless runtimes.                     |
| **Remote associative/vector memory** | **Turso/libSQL (cloud)**        | Persisted, installation-scoped opt-in memory via `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`. Conversations remain local unless cloud sync is implemented (opt-in, follow-up). |

Use your **Cloudflare** account for Pages (and DNS/domain/proxy as desired). Keep the **API on Render** (or another long-running host) while using the current server implementation. Turso is external to both.

## 1) Turso (remote memory DB)

- Create a Turso database (prod; optionally dev/staging). Obtain:
  - `TURSO_DATABASE_URL` (e.g. `libsql://<db>-<org>.turso.io`)
  - `TURSO_AUTH_TOKEN` (least-privilege server token)
- The server auto-creates/migrates `vector_memories` on first use (`installation_id` scoped). Remote memory is **opt-in** and accessed only via scoped `/api/memory/*` (`installationId` + `optIn: true`).

**Local dev:** set `TURSO_DATABASE_URL=file:server/data/local-vector.db` in root `.env` for persistent local libSQL (no token). Unset to fall back to in-memory (non-persistent).

## 2) API on Render

- Use `Dockerfile` and/or `render.yaml` (blueprint example).
- Create a Web Service (Docker) from this repo, runtime long-running.
- Env/secrets (server-side only, never `VITE_*`):
  - `NODE_ENV=production`
  - `PORT` (Render provides; service listens on it)
  - `CORS_ORIGIN=https://<your-web-origin>` (Cloudflare Pages/custom domain origin)
  - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
  - Provider keys/endpoints as needed: `NVIDIA_NIM_API_KEY` (fallback NVIDIA NIM/OpenAI-compatible), `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `ANTHROPIC_API_KEY`, `ZEN_API_KEY`. If OpenAI keys/endpoints are not configured, the server falls back to NVIDIA NIM (`https://integrate.api.nvidia.com/v1`) when a NVIDIA key is available. Explicit user-configured OpenAI-compatible endpoints/keys are not overridden.
- Start command is defined by Docker `CMD` (`bun run --bun server/src/index.ts`). Note the API origin URL for the web app (e.g. `https://<service>.onrender.com`).

## 3) Web on Cloudflare Pages (chosen)

- **Project:** `innerview` (Cloudflare Pages) — production: `https://innerview.pages.dev`
- **API origin:** `https://innerview.onrender.com` (Render)
- Build settings:
  - **Build command:** `bun run build:pages` (builds with `VITE_API_BASE_URL` defaulting to the Render API and prunes files >25 MiB for Pages upload limits)
  - **Build output directory:** `dist`
- Environment variable (Pages build/runtime as applicable):
  - `VITE_API_BASE_URL=https://innerview.onrender.com` (no trailing slash needed)
- SPA fallback: `public/_redirects` is included (`/* /index.html 200`) for client-side routing/deep links.
- Set Render `CORS_ORIGIN` to the exact Pages/custom web origin (e.g. `https://innerview.pages.dev`).

**Notes:** Cloudflare Pages direct uploads reject files >25 MiB. `scripts/prune-pages-dist.ts` (run by `build:pages`) removes oversized assets (e.g. bundled ORT WASM) from `dist`; server/cloud-first compute remains the default path, but client-side/local inference assets pruned from deploy may be unavailable until hosted separately/CDN-configured.

**Netlify alternative:** `netlify.toml` is provided (`bun run build`, publish `dist`, SPA redirect). Set `VITE_API_BASE_URL` in Netlify env and `CORS_ORIGIN` on Render to the Netlify origin.

## 4) Verify end-to-end (in deployed env)

- Web loads from Cloudflare Pages and calls API at `VITE_API_BASE_URL`.
- CORS allows the web origin; preflight/credentials as applicable.
- Streaming/chat works (long-lived responses) and `/api` routes reachable.
- Turso connectivity/persistence: with Privacy opt-in + installation id, test scoped add/search/count/export/delete and confirm persistence across restarts and isolation between installations.
- SPA deep-link refresh resolves (fallback to `index.html`).
- Real-browser checks on tablet/laptop (including flows noted as unverified in repo status).

### Render diagnostics/logs (API tooling)

For deployment diagnostics (service status, recent deploys/events, and log retrieval where the Render API exposes it), use the included script (requires a Render API key; never commit secrets):

```bash
# Set locally (or export in shell):
# RENDER_API_KEY=...
# RENDER_SERVICE_ID=srv-...   # or exact service name

bun run render:summary
# or
bun scripts/render-diagnostics.ts summary --service-id <srv-id|name> --limit 10
bun scripts/render-diagnostics.ts deploys --service-id <srv-id|name> --limit 10
bun scripts/render-diagnostics.ts events --service-id <srv-id|name> --limit 10
bun scripts/render-diagnostics.ts logs --service-id <srv-id|name> [--deploy-id <dep-id>] --limit 100
```

- `render.yaml` includes `healthCheckPath: /health` for the API service.
- If log retrieval is not available for your account/API path, use Render dashboard log streaming or Render CLI for live/tailing logs; the script reports attempted endpoints and errors.

## Privacy/compute defaults

- **Cloud/server-first compute** (embeddings, LLM, transcription) for weak/tablet clients; client compute opt-in with server fallback.
- **Local-only by default** for conversations; remote/vector memory **opt-in** with consent, scoped per anonymous installation identity (no sign-in). Do not expose server secrets to the client.

See `.env.example` and `server/.env.example`.

## Docker (local)

Containerization for the API is provided via `Dockerfile` and `docker-compose.yml` (web/static frontend remains a separate concern per the chosen split).

```bash
# Build and run API container (reads .env; ensure CORS_ORIGIN/TURSO_* as needed)
docker compose up --build

# Or run in background
docker compose up -d --build

# Logs / stop
docker compose logs -f api
docker compose down
```

- API listens on `http://localhost:${PORT:-3002}` (container port 3002). Configure `CORS_ORIGIN` for your web origin (e.g. `http://localhost:5173` when running Vite locally).
- `.env` is loaded by compose but never baked into the image (`.dockerignore` excludes it). Provide secrets via env vars/secrets in real deployments.
- `innerview-data` volume persists `/app/server/data` in-container (relevant for file-backed/local storage modes). For cloud memory use `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.
