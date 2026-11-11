# Innerview - Philosophical Chat Application

See [CHARTER.md](CHARTER.md) for the original project prompt and intent.

## Tech Stack

### Frontend

- React + TypeScript
- Vite (build tool)
- Chakra UI v3
- Framer Motion (animations)
- AI SDK React (`@ai-sdk/react`)
- WaveSurfer.js (voice visualization)
- Microsoft Cognitive Services Speech SDK

### Backend

- Hono (lightweight server)
- AI SDK (`ai` package)
- Anthropic Claude (via `@ai-sdk/anthropic`)
- In-memory vector store and knowledge graph (placeholders for production)

## Project Structure

```
project/
├── src/                    # Frontend source
│   ├── components/
│   │   ├── chat/          # Chat components
│   │   └── background/    # Background animations
│   ├── hooks/             # React hooks
│   └── lib/               # Utilities
├── backend/               # Backend source
│   └── src/
│       ├── agents/        # AI agent configuration
│       ├── memory/        # Memory systems
│       ├── tools/         # Agent tools
│       └── routes/        # API routes
└── shared/                # Shared types
```

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables:
   Create a `.env` file in the root directory:

```
ANTHROPIC_API_KEY=your_api_key_here
```

3. Start both frontend and backend:

```bash
bun run dev
```

The `dev` command automatically cleans up any lingering processes on ports 5173 (frontend) and 3001 (backend) before starting. If you need to manually free these ports, run:

```bash
bun run kill-ports
```

Or run frontend and backend separately:

```bash
# Frontend only
bun run dev:client

# Backend only
bun run dev:server
```

## Development

The frontend runs on `http://localhost:5173` and proxies API requests to the backend at `http://localhost:3001`.

### Transcription Testing

The app automatically tests the transcription service during startup using a **frontend-first approach** that validates the entire user flow:

1. Frontend downloads test audio (3-second public domain MP3)
2. Frontend POSTs to `/api/transcription` endpoint
3. Backend processes and returns result
4. Frontend validates response and reports progress

This tests the **actual user flow** (frontend → backend API → response) rather than testing components in isolation.

**Manual testing:**

```typescript
// Test via frontend (full user flow)
import { testTranscriptionService } from '@/lib/transcription';

await testTranscriptionService(onProgress, {
  provider: 'local',
  testBackendAPI: true, // Tests via /api/transcription
});
```

**Backend debugging scripts:**

```bash
# Test backend model directly (not via API)
bun run test:transcription:short
bun run test:transcription:long
```

**Skip automatic testing:**

```typescript
await preloadWhisperModel(onProgress, { skipTest: true });
```

**Documentation:**

- Architecture: `docs/TRANSCRIPTION_ARCHITECTURE.md`
- Quick Start: `docs/TRANSCRIPTION_QUICK_START.md`
- Full Guide: `docs/TRANSCRIPTION_TESTING.md`

## Architecture

The application uses a tool-based agent architecture where memory queries are intentional operations. The philosophical agent uses two main tools:

- `queryKnowledgeGraph`: Recalls specific entities and relationships
- `queryAssociativeMemory`: Finds similar themes from conversation history

Memory systems are currently in-memory implementations. For production, integrate with:

- Vector store: Pinecone or Chroma
- Knowledge graph: Neo4j
