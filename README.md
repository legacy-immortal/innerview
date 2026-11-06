# Innerview - Philosophical Chat Application

# Original Prompt

I need to spec out an ai application. It's purpose is for onboarding users to a site that helps them reclaim their digital footprint and create and share meaningful memories with the long term goal of "telling their story" or "sending their message" so to speak in preparation for their eventual death and after. It perhaps sounds grim but it's meant to be a celebration of life. The "onboarding agent", we're calling it, is not really meant to teach users how to use the app, it's is meant to be more cryptic than useful and drive interest in our project, however, we don't want to give the impression that the users are being sent through a T-maze with our product at the end or that the agent is leading them down the garden path to buy something etc. Rather it's meant to be more of an informal psychoanalyst or philosophical interlocutor asking the user interesting questions that might prompt them to share their beliefs about a topic (such as life and death, the meaning and purpose of life, what it means to be good, whether or not God exists, why humanity created religion and so forth, but far less... puerile or like an undergraduate philosophy course, more like a frank and honest conversation with a philosophically inclined and sophisticated interlocutor but without being pretentious or verbose, we want to exploit the creative potential of AI discovered in 2023 before the safety guards were put on and it's somewhat whimsical and freewheeling nature and capacity to hallucinate while keeping it grounded). The purpose of the app is to be interesting and thought provoking and keep the conversation going. The agent won't be collecting information about the user for analytics or building an internal representation or psychometric profile, it will only have a memory of the current conversation and takes the user at their word without judgment, what the user says is the only thing it can claim to know about them. As far as it's prompting is concerned, Lacanian psychoanalysis and it's interpretive technique should be used to guide it's conversational style but with 0 reference to it's theory unless the user brings up the topic themselves. It should reply with short curt "interpretive" responses, "scanding" but not ending the conversation to note or underscore interesting or provocative statements, respond with multilayered multi-dimensional jokes or phrases, it should use amphiboly and metonymy, double entendres, and metaphor it should have an "evenly suspended attention" to give the impression it's listening and understanding more than just trying to talk by encouraging the user to always say more. The agent should also freely admit and be "aware" (to the extent it can be) of the fact that it's an AI. It should also be ethical but not according to contemporary metrics you might find on huggingface, but more in the sense that the AI considers the conversation "bracketed" and that nothing said by it or by the user should be actionable and is considered private while asserting that it's not a therapist but rather just meant to be interesting while being frank and objective with truth as it's ultimate aim more than concerning itself with the attitude and feelings of the user. So it's ethics might be considered in the tradition of classical liberalism and, again, the humanism of Lacanian psychoanalysis (helping the user find "the Truth" whatever that is for them and without the AI knowing what that might be off the bat as an equal partner but who has useful information or knowledge in this endeavor). Probably this calls for some sort of constitutional AI. The agent should have a long term and short term memory, where the long term is a summary of the course of the conversation and the short term is more of a "free associative" memory powered by vector storage database where it can "remember" similar statements it or the user has said to inform it's replies, it might be further enhanced by an entity/knowledge graph based memory so it can remember things the user has told it about certain subjects and things but again, it should not try to build any knowledge about the user themselves, just what they've said over the course of the conversation. It should also freely admit that it may have "forgotten" information about the user if they reference something they talked about previously. The bot should have it's summary and associative memory automatically injected into it's prompt while for it's active memory (the knowledge graph) it can query with tools so it should be an agent. So much for the prompting, I'm sure that can be fine-tuned later. I think the latest version of Vercel's AI library would be appropriate for the front-end via the useChat hook with Langchain v1 as the back-end (the agent will do it's work in the background and stream out the results in a format compatible with the ai library's stream protocol, however, Vercel's ai package might be redundant (although it has some useful abstractions). I've had terrible luck with Next.js which on paper is fine but was a fiasco for my last AI project because of it's instability and slow performance. I'm thinking a React front-end with an express back-end although I would be willing to try Hono or Fastify. The front-end framework should allow us to animate things easily, a part of the requirements for the front-end is creating a dark, soothing, hypnotic, and interesting background for the chat while the user engages with the bot. Voice and voice synthesis are also a requirement. It would be cool if we could animate the waveform of the bot's voice as it "speaks" in the background. What libraries do you think we should use? How do we organize the project (front-end and back-end code)? What do you propose?

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
  testBackendAPI: true // Tests via /api/transcription
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
