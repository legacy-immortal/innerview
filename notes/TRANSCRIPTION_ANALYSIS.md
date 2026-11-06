# Transcription Services Analysis

## Current State Overview

This document analyzes the transcription implementation across three components:

1. **Browser-based transcription** using Transformers.js via `@built-in-ai/transformers-js`
2. **Backend transcription service** using faster-whisper
3. **Local transcription implementation** status

---

## Key Findings

### 1. **@built-in-ai/transformers-js Transcription Support**

**CORRECTION**: `@built-in-ai/transformers-js` **DOES** support transcription models via `transformersJS.transcription()`.

According to the [official README](https://raw.githubusercontent.com/jakobhoeg/built-in-ai/refs/heads/main/packages/transformers-js/README.md), the package supports:

- Language models (chat)
- Text embeddings
- Vision models
- **Transcription/ASR models** via `transformersJS.transcription(modelId, settings?)`

**Current Issue**: The installed version (0.1.3) may have incomplete type definitions, but the README shows transcription is supported. The code is using the wrong API approach.

### 2. **Implementation Inconsistencies**

#### A. Model Preloader (`src/lib/model-preloader.ts`)

- **Line 129**: Attempts to use `@built-in-ai/transformers-js` for Whisper model preloading
- **Line 142**: Tries to use raw `pipeline()` function (incorrect API)
- **Problem**: Should use `transformersJS.transcription()` API instead of raw `pipeline()`
- **Current behavior**: Falls back to simulated progress (lines 172-201)

#### B. Local Transcription Provider (`src/lib/transcription/local/local-transcription-provider.ts`)

- **Line 21**: Comment correctly states it should use `@built-in-ai/transformers-js` for browser transcription
- **Line 69-71**: TODO comment **incorrectly** claims transcription isn't supported:
  ```typescript
  // Note: @built-in-ai/transformers-js doesn't support transcription yet
  // For now, browser mode also uses the backend API
  // TODO: Implement browser-based transcription using @huggingface/transformers directly
  ```
- **Problem**: The code doesn't use `transformersJS.transcription()` API - it should!

#### C. Local Transcription Model (`src/lib/transcription/local/local-transcription-model.ts`)

- **Line 2**: Comment says "Browser-based transcription is handled by @built-in-ai/transformers-js directly"
- **Reality**: The `doGenerate()` method only implements `transcribeBackend()` (line 49)
- **Problem**: Browser mode is not implemented - should use `transformersJS.transcription()` from `@built-in-ai/transformers-js`

#### D. Backend Transcription Route (`server/src/routes/transcription.ts`)

- **Line 23**: Contains TODO comment with placeholder implementation
- **Line 63-68**: Returns placeholder response:
  ```typescript
  return c.json({
    text: 'Transcription not yet implemented. Please use browser-based transcription or OpenAI.',
    segments: [],
    language: language || undefined,
    duration: undefined,
  });
  ```
- **Problem**: Backend transcription is not implemented

---

## Architecture Flow

### Current Flow (Broken)

```
User records audio
  ↓
useTranscription hook
  ↓
transcriptionService.transcribe()
  ↓
If provider === 'local':
  ↓
localTranscription.transcriptionModel('whisper-browser')
  ↓
LocalTranscriptionModel.doGenerate()
  ↓
transcribeBackend() [ALWAYS, even for browser mode]
  ↓
POST /api/transcription
  ↓
Returns placeholder: "Transcription not yet implemented"
```

### Intended Flow (Not Implemented)

#### Browser Mode:

```
User records audio
  ↓
useTranscription hook
  ↓
transcriptionService.transcribe()
  ↓
If provider === 'local' && mode === 'browser':
  ↓
Use transformersJS.transcription() from @built-in-ai/transformers-js
  ↓
const model = transformersJS.transcription('Xenova/whisper-base')
  ↓
const result = await transcribe({ model, audio: audioData })
  ↓
Return transcription result
```

#### Backend Mode:

```
User records audio
  ↓
useTranscription hook
  ↓
transcriptionService.transcribe()
  ↓
If provider === 'local' && mode === 'backend':
  ↓
POST /api/transcription
  ↓
faster-whisper implementation
  ↓
Return transcription result
```

---

## Dependencies Status

### Frontend (`package.json`)

- ✅ `@built-in-ai/transformers-js@^0.1.0` (installed: 0.1.3) - **Supports transcription** via `transformersJS.transcription()`
- ✅ `ai@^5.0.89` - Required for `transcribe()` function from Vercel AI SDK

### Backend (`server/package.json`)

- ✅ `@huggingface/transformers@^3.7.6` - Installed (used for embeddings)
- ❌ `faster-whisper` - **NOT installed** (needed for backend transcription)

---

## What Needs to Be Fixed

### 1. **Browser-Based Transcription** (High Priority)

- [ ] Implement browser transcription in `LocalTranscriptionModel.doGenerate()` when `mode === 'browser'`
- [ ] Use `transformersJS.transcription()` API correctly:

  ```typescript
  import { transformersJS } from '@built-in-ai/transformers-js';
  import { transcribe } from 'ai';

  const transcriptionModel = transformersJS.transcription(
    'Xenova/whisper-base',
    {
      device: 'webgpu', // or 'cpu'
      language: this.config.language,
      returnTimestamps: true,
    }
  );

  const result = await transcribe({
    model: transcriptionModel,
    audio: audioData,
  });
  ```

- [ ] Update `model-preloader.ts` to use `transformersJS.transcription()` instead of raw `pipeline()`
- [ ] Fix `LocalTranscriptionProvider` to use `transformersJS.transcription()` directly instead of wrapping it
- [ ] Update comments to reflect that `@built-in-ai/transformers-js` DOES support transcription

### 2. **Backend Transcription** (Medium Priority)

- [ ] Install `faster-whisper` in backend: `pip install faster-whisper` (or use Node.js wrapper)
- [ ] Implement faster-whisper in `server/src/routes/transcription.ts`
- [ ] Handle audio format conversion (WebM/MP4 to WAV if needed)
- [ ] Return proper transcription results with segments

### 3. **Code Cleanup** (Low Priority)

- [ ] Update comments to correctly state that `@built-in-ai/transformers-js` DOES support transcription
- [ ] Remove TODO comments that incorrectly claim transcription isn't supported
- [ ] Update documentation to reflect correct API usage
- [ ] Ensure consistent error handling across both modes

---

## Current Workaround

The current implementation has a workaround:

- When `provider === 'local'`, it always falls back to the backend API
- The backend API returns a placeholder message
- Users must use `provider === 'openai'` for actual transcription

---

## Recommendations

1. **Immediate**: Implement browser-based transcription using `transformersJS.transcription()` from `@built-in-ai/transformers-js`
2. **Short-term**: Implement backend transcription with faster-whisper
3. **Long-term**: Consider simplifying the local transcription provider to directly use `transformersJS.transcription()` instead of wrapping it

---

## Files Requiring Changes

### High Priority

- `src/lib/transcription/local/local-transcription-model.ts` - Implement browser transcription using `transformersJS.transcription()`
- `src/lib/transcription/local/local-transcription-provider.ts` - Update to use `transformersJS.transcription()` directly
- `src/lib/model-preloader.ts` - Fix Whisper preloading to use `transformersJS.transcription()` API

### Medium Priority

- `server/src/routes/transcription.ts` - Implement faster-whisper
- `server/package.json` - Add faster-whisper dependency (or Python setup)

### Low Priority

- `src/lib/transcription/local/local-transcription-provider.ts` - Update comments
- `src/lib/transcription/local/local-transcription-model.ts` - Update comments

---

## Summary

**Status**: Transcription implementation is incomplete and uses the wrong API approach.

**Main Issues**:

1. **Wrong API Usage**: Code doesn't use `transformersJS.transcription()` - instead tries to use provider's `transcriptionModel()` method or raw `pipeline()`
2. **Browser Mode Not Implemented**: Browser mode routes to backend API instead of using `transformersJS.transcription()`
3. **Backend Transcription Not Implemented**: Backend route is a placeholder
4. **Outdated Comments**: Comments incorrectly claim `@built-in-ai/transformers-js` doesn't support transcription

**Key Discovery**: According to the [official README](https://raw.githubusercontent.com/jakobhoeg/built-in-ai/refs/heads/main/packages/transformers-js/README.md), `@built-in-ai/transformers-js` **DOES support transcription** via:

```typescript
import { transformersJS } from '@built-in-ai/transformers-js';
import { transcribe } from 'ai';

const model = transformersJS.transcription('Xenova/whisper-base');
const result = await transcribe({ model, audio: audioData });
```

**Next Steps**:

1. Update `LocalTranscriptionModel` to use `transformersJS.transcription()` for browser mode
2. Update `model-preloader.ts` to use the correct API
3. Implement backend transcription with faster-whisper
4. Update all comments and documentation
