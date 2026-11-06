# Backend Configuration & Settings Proposal

## Problem Statement

1. **Clunky `getEnv()` function** - Frontend environment variable access is awkward
2. **No backend configuration system** - Backend has no structured config management
3. **No settings storage** - TTS settings and user preferences have no persistence
4. **Scattered environment variables** - No centralized management

## Solution Overview

A comprehensive backend configuration and settings system that:

- ✅ Provides clean, type-safe config access
- ✅ Validates environment variables on startup
- ✅ Stores user settings (TTS preferences, etc.)
- ✅ Offers API endpoints for settings management
- ✅ Supports multiple storage backends (in-memory → file → database)

## Architecture

### Configuration Layer

```
Environment Variables (.env)
    ↓
Config Service (validated, typed)
    ↓
Application Code
```

**Benefits:**

- Type-safe access: `config.ai.anthropicApiKey`
- Validation on startup (fails fast)
- Single source of truth
- No more `process.env` scattered everywhere

### Settings Layer

```
Frontend
    ↓
Settings API (/api/settings)
    ↓
Settings Service
    ↓
Settings Store (in-memory / file / database)
```

**Benefits:**

- Centralized settings management
- Can sync across devices
- Persistent storage option
- Session-based or user-based

## Implementation

### 1. Configuration System

**Files Created:**

- `backend/src/config/env.ts` - Environment variable loader with Zod validation
- `backend/src/config/index.ts` - Config service with typed access
- `backend/.env.example` - Template for environment variables

**Usage:**

```typescript
import { config } from './config/index.js';

// Type-safe access
const apiKey = config.ai.anthropicApiKey;
const port = config.server.port;
const enableProxy = config.tts.enableProxy;
```

**Benefits over `getEnv()`:**

- ✅ No clunky helper function needed
- ✅ Type-safe with autocomplete
- ✅ Validated on startup
- ✅ Clear error messages

### 2. Settings Storage

**Files Created:**

- `backend/src/settings/types.ts` - Settings types (imports from shared)
- `backend/src/settings/store.ts` - Storage abstraction (in-memory/file)
- `backend/src/settings/service.ts` - Business logic
- `backend/src/routes/settings.ts` - API endpoints

**Storage Options:**

1. **In-Memory** (default) - Fast, no persistence
2. **File-Based** - JSON file in `data/settings.json`
3. **Database** (future) - SQLite/PostgreSQL

**API Endpoints:**

```
GET    /api/settings          # Get all settings
PUT    /api/settings          # Update all settings
GET    /api/settings/tts      # Get TTS settings
PUT    /api/settings/tts      # Update TTS settings
PATCH  /api/settings/tts      # Partial update
GET    /api/config            # Get public server config
```

### 3. Shared Types

**Updated:**

- `shared/types.ts` - Added `TTSSettings` and `UserSettings`

**Benefits:**

- Type safety across frontend/backend
- Single source of truth for settings structure

## Data Storage Specification

### What Gets Stored Where

#### Environment Variables (`.env`)

- **API Keys** - External service credentials
- **Service URLs** - TTS servers, databases
- **Feature Flags** - Enable/disable features
- **Server Config** - Port, CORS, etc.

**Example:**

```env
ANTHROPIC_API_KEY=sk-...
ELEVENLABS_API_KEY=...
XTTS_SERVER_URL=http://localhost:8020
ENABLE_TTS_PROXY=false
```

#### Settings Store (Backend)

- **User Preferences** - TTS provider, voice selections
- **Session Data** - Current TTS state
- **UI Preferences** - Theme, language

**Example:**

```json
{
  "session-id": {
    "tts": {
      "provider": "kokoro",
      "kokoro": {
        "defaultVoice": "af_heart",
        "speakingRate": 1.2
      }
    },
    "preferences": {
      "theme": "dark"
    }
  }
}
```

#### Session Data (In-Memory)

- **Active Conversations** - Current chat state
- **Temporary State** - Current TTS playback

### Storage Strategy

**Phase 1: In-Memory (Current)**

- Fast development
- No persistence
- Good for testing

**Phase 2: File-Based (Simple)**

- `data/settings.json` - User settings
- `data/conversations/` - Conversation data
- Easy migration path

**Phase 3: Database (Production)**

- SQLite for local
- PostgreSQL for production
- Proper multi-user support

## Migration from Frontend `getEnv()`

### Old Way (Clunky):

```typescript
// Frontend
function getEnv(key: string, defaultValue?: string): string | undefined {
  // @ts-ignore - Vite provides import.meta.env
  return import.meta.env[key] || defaultValue;
}

const apiKey = getEnv('VITE_ELEVENLABS_API_KEY');
```

### New Way (Backend):

```typescript
// Backend
import { config } from './config/index.js';

const apiKey = config.tts.elevenLabsApiKey; // Type-safe!
```

### Frontend Integration:

```typescript
// Option 1: Still use environment variables (for public config)
const provider = import.meta.env.VITE_TTS_PROVIDER || 'kokoro';

// Option 2: Fetch from backend (for user settings)
const { speak } = useVoiceSynthesis(); // Auto-fetches from backend
```

## Benefits Summary

### Configuration

1. ✅ **Type Safety** - Full TypeScript support
2. ✅ **Validation** - Zod schemas validate on startup
3. ✅ **Clean API** - No more `getEnv()` clunkiness
4. ✅ **Documentation** - `.env.example` shows all options
5. ✅ **Error Messages** - Clear validation errors

### Settings

1. ✅ **Centralized** - All settings in one place
2. ✅ **Persistent** - Can survive restarts (file mode)
3. ✅ **Flexible** - Easy to add new settings
4. ✅ **API Access** - Frontend can read/write settings
5. ✅ **Session Support** - Per-session or per-user

## Next Steps

### Immediate

1. ✅ Config system implemented
2. ✅ Settings API created
3. ✅ Types defined
4. ⏳ Install missing dependencies (`@types/node`, `dotenv` if needed)
5. ⏳ Create `.env` file from `.env.example`

### Short Term

1. Update frontend to optionally use backend settings
2. Add session management
3. Test settings persistence

### Long Term

1. Migrate to database storage
2. Add user authentication
3. Add settings sync across devices

## Dependencies Needed

```bash
npm install --save-dev @types/node
# dotenv is optional - we're using process.env directly
# hono/cors is built into hono package
```

## Example Usage

### Backend Config Access:

```typescript
import { config } from './config/index.js';

// Server config
console.log(`Server running on port ${config.server.port}`);

// AI config
const model = createAnthropic({
  apiKey: config.ai.anthropicApiKey,
});

// TTS config
if (config.tts.enableProxy) {
  // Setup TTS proxy
}
```

### Frontend Settings Access:

```typescript
// Fetch settings from backend
const response = await fetch('/api/settings/tts', {
  headers: { 'X-Session-Id': sessionId },
});
const ttsSettings = await response.json();

// Use in TTS provider
const { speak } = useVoiceSynthesis(ttsSettings);
```

## Comparison

| Aspect          | Old (`getEnv()`) | New (Config Service) |
| --------------- | ---------------- | -------------------- |
| Type Safety     | ❌ String only   | ✅ Fully typed       |
| Validation      | ❌ None          | ✅ Zod validation    |
| Error Messages  | ❌ Generic       | ✅ Specific          |
| Autocomplete    | ❌ None          | ✅ Full support      |
| Documentation   | ❌ Scattered     | ✅ `.env.example`    |
| Backend Support | ❌ None          | ✅ Full system       |

## Conclusion

This proposal provides:

- ✅ Clean, type-safe configuration
- ✅ Centralized settings management
- ✅ Scalable storage architecture
- ✅ Better developer experience
- ✅ Production-ready foundation

The system is designed to grow from simple in-memory storage to full database persistence as needed.
