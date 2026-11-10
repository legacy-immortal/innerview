# Innerview API (Bun + Hono) - for Render/Fly/VPS
# Cloud-first: run as a long-running service; connect to Turso/libSQL for opted-in memory.
FROM oven/bun:1 AS base
WORKDIR /app

# Install deps (root + server workspace)
COPY package.json bun.lock ./
COPY server/package.json ./server/package.json
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build client assets if you want to serve static from this container (optional).
# RUN bun run build

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

# Start API server
CMD ["bun", "run", "--bun", "server/src/index.ts"]
