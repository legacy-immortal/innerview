# Backend Configuration & Settings Specification

## Overview

This specification defines how configuration, settings, and data are managed in the backend, addressing the clunky `getEnv` function and providing a clean, scalable architecture.

## Architecture Principles

1. **Separation of Concerns:**
   - **Environment Variables** → Runtime configuration (API keys, URLs, feature flags)
   - **User Settings** → User preferences (TTS provider, voice preferences)
   - **Session Data** → Temporary conversation state
   - **Persistent Data** → Conversations, memories, knowledge graphs

2. **Configuration Layers:**

   ```
   Environment Variables (dotenv)
   ↓
   Config Service (validated, typed)
   ↓
   Application Code
   ```

3. **Settings Storage:**
   ```
   User Settings API
   ↓
   Settings Store (in-memory → database)
   ↓
   Settings Service
   ```

## Configuration System

### 1. Environment Variables (Backend)

**Location:** `backend/.env` (gitignored)

**Categories:**

- **API Keys:** External service credentials
- **Service URLs:** TTS servers, vector DBs, etc.
- **Feature Flags:** Enable/disable features
- **Server Config:** Port, CORS, etc.

**Example `.env`:**

```env
# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# AI Services
ANTHROPIC_API_KEY=your_key_here

# TTS Services (for backend TTS proxy if needed)
ELEVENLABS_API_KEY=your_key_here
XTTS_SERVER_URL=http://localhost:8020
TTS_WEBUI_ENDPOINT=http://127.0.0.1:7778/v1/audio/speech

# Memory/Storage (future)
# VECTOR_DB_URL=
# KNOWLEDGE_GRAPH_URL=
# DATABASE_URL=

# Feature Flags
ENABLE_TTS_PROXY=false
ENABLE_VOICE_CLONING=false
```

### 2. Config Service

**Location:** `backend/src/config/index.ts`

**Responsibilities:**

- Load and validate environment variables
- Provide typed access to config
- Default values
- Environment-specific overrides

**Benefits:**

- Type-safe configuration
- Single source of truth
- Validation on startup
- No scattered `process.env` calls

## Settings Storage Specification

### Settings Categories

#### 1. **User Settings** (Per User/Session)

- TTS provider preferences
- Voice selections
- UI preferences
- Feature toggles

#### 2. **Application Settings** (Global)

- Default TTS provider
- System-wide configurations
- Feature flags

#### 3. **Session Data** (Temporary)

- Active conversations
- Current TTS state
- Temporary voice selections

### Data Storage Strategy

**Phase 1: In-Memory (Current)**

- Fast development
- No persistence
- Resets on restart

**Phase 2: File-Based (Simple)**

- JSON file storage
- Easy migration
- Good for single-user

**Phase 3: Database (Production)**

- SQLite for local
- PostgreSQL for production
- Proper persistence

## Proposed Implementation

### File Structure

```
backend/
├── .env                    # Environment variables (gitignored)
├── .env.example           # Template for environment variables
├── src/
│   ├── config/
│   │   ├── index.ts       # Config service
│   │   ├── env.ts         # Environment variable loader
│   │   └── schema.ts      # Zod schemas for validation
│   ├── settings/
│   │   ├── store.ts       # Settings storage abstraction
│   │   ├── service.ts     # Settings business logic
│   │   └── types.ts       # Settings types
│   └── routes/
│       └── settings.ts    # Settings API endpoints
└── data/                  # Persistent data (gitignored)
    ├── settings.json      # User settings
    └── conversations/     # Conversation data
```

### API Endpoints

```
GET    /api/settings              # Get user settings
PUT    /api/settings              # Update user settings
GET    /api/settings/tts          # Get TTS settings
PUT    /api/settings/tts          # Update TTS settings
GET    /api/config                # Get server config (public, no secrets)
```

## Benefits

1. **Clean Environment Access:**
   - No more `getEnv()` clunkiness
   - Type-safe config access
   - Validation on startup

2. **Centralized Settings:**
   - Backend manages TTS settings
   - Can sync across devices
   - Can be shared between frontend instances

3. **Scalability:**
   - Easy to add new settings
   - Easy to migrate to database
   - Clear separation of concerns

4. **Developer Experience:**
   - Clear `.env.example` template
   - TypeScript autocomplete
   - Runtime validation

## Migration Path

1. **Phase 1:** Implement config service (immediate)
2. **Phase 2:** Add settings API (next)
3. **Phase 3:** Migrate frontend to use backend settings (optional)
4. **Phase 4:** Add persistent storage (future)
