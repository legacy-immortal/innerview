# Deployment

Targets a split, cloud-first setup for weak/tablet clients: **static web + long-running API + managed DB**.

## Chosen split (recommended, compatible now)

| Layer | Where | Why |
|---|---|---|
| **Web (SPA)** | **Cloudflare Pages** | Global static CDN; Vite build output. (Netlify also works — `netlify.toml` included.) |
| **API** | **Render** (Docker web service) | Long-running Bun/Hono server: streaming, server-side embeddings/model init/download/cache, in-process state. Not drop-in for edge/serverless runtimes. |
| **Remote associative/vector memory** | **Turso/libSQL (cloud)** | Persisted, installation-scoped opt-in memory via `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`. Conversations remain local unless cloud sync is implemented (opt-in, follow-up). |

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
  - Provider keys as needed: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `ANTHROPIC_API_KEY`, `ZEN_API_KEY`
- Start command is defined by Docker `CMD` (`bun run --bun server/src/index.ts`). Note the API origin URL for the web app (e.g. `https://<service>.onrender.com`).

## 3) Web on Cloudflare Pages

- Framework preset: **None/Vite** (or auto-detect). Build settings:
  - **Build command:** `bun run build`
  - **Build output directory:** `dist`
- Environment variable:
  - `VITE_API_BASE_URL=https://<your-render-api-origin>` (no trailing slash needed)
- SPA fallback: `public/_redirects` is included (`/* /index.html 200`) for client-side routing/deep links.
- After deploy, set Render `CORS_ORIGIN` to the exact Pages/custom web origin.

**Netlify alternative:** `netlify.toml` is provided (`bun run build`, publish `dist`, SPA redirect). Set `VITE_API_BASE_URL` in Netlify env and `CORS_ORIGIN` on Render to the Netlify origin.

## 4) Verify end-to-end (in deployed env)

- Web loads from Cloudflare Pages and calls API at `VITE_API_BASE_URL`.
- CORS allows the web origin; preflight/credentials as applicable.
- Streaming/chat works (long-lived responses) and `/api` routes reachable.
- Turso connectivity/persistence: with Privacy opt-in + installation id, test scoped add/search/count/export/delete and confirm persistence across restarts and isolation between installations.
- SPA deep-link refresh resolves (fallback to `index.html`).
- Real-browser checks on tablet/laptop (including flows noted as unverified in repo status).

## Privacy/compute defaults

- **Cloud/server-first compute** (embeddings, LLM, transcription) for weak/tablet clients; client compute opt-in with server fallback.
- **Local-only by default** for conversations; remote/vector memory **opt-in** with consent, scoped per anonymous installation identity (no sign-in). Do not expose server secrets to the client.

See `.env.example` and `server/.env.example`.
