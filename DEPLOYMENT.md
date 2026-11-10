# Deployment (draft)

Targets a split, cloud-first setup for weak/tablet clients: **static web + long-running API + managed DB**.

## Recommended (2A): Netlify (web) + Render (API) + Turso/libSQL
- **Web (Netlify):** build `bun run build`, publish `dist/`, SPA fallback via `netlify.toml`.
  - Set `VITE_API_BASE_URL=https://<your-render-api>` (no trailing slash needed).
- **API (Render, Bun/Node service):** run the Hono server (`bun run --bun server/src/index.ts` or equivalent start) as a persistent web service.
  - Set `PORT` (Render provides), `NODE_ENV=production`, `CORS_ORIGIN=https://<your-netlify-site>`.
  - Configure provider keys as needed (`OPENAI_API_KEY`/`OPENAI_BASE_URL`, etc.).
  - Optional durable vector memory: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (server-side only; never expose to client).
- **Database/vector:** Turso/libSQL for opted-in remote persistence/vector storage; local-only remains default.

## Notes
- Default compute is **cloud/server-side** (embeddings, LLM, transcription). Client compute is opt-in and must fall back to server.
- Persistence/vector memory should be **opt-in** with clear consent, scoped per anonymous installation identity (no sign-in) when remote sync is enabled.
- Streaming/chat and model downloads require a long-running API host (Render/Fly/VPS). Netlify/Cloudflare edge runtimes are not drop-in for the current Bun/native/model server; use them for static delivery or, later, refactored compatible subsets.
- Verify end-to-end: CORS, streaming, `/api` reachability, Turso connectivity, and tablet flows in a real browser.

See `.env.example` and `server/.env.example`.

## Render API (example)
- A sample `Dockerfile` and `render.yaml` are included for the API service.
- Render: create a Web Service (Docker) from this repo, set `CORS_ORIGIN` to the web origin, and configure `TURSO_*` / provider keys as needed. Set the web app's `VITE_API_BASE_URL` to the Render service URL.
- This server is long-running (streaming, model init, in-memory caches) — avoid serverless/edge runtimes for the current build.
