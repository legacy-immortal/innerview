# Vercel AI SDK Speech Model Streaming Analysis

## Research Question

**Does Vercel's SpeechModelV2 interface natively support streaming, or do we need to extend it?**

---

## Current SpeechModelV2 Interface

Based on the codebase analysis, the `SpeechModelV2` interface from `@ai-sdk/provider` has the following structure:

```typescript
interface SpeechModelV2 {
  readonly specificationVersion: 'v2';
  readonly modelId: string;
  readonly provider: string;

  doGenerate(
    options: SpeechModelV2CallOptions
  ): Promise<SpeechModelV2CallResult>;
}
```

### Key Observations

1. **Single Method**: Only `doGenerate()` method exists
2. **Returns Promise**: Returns complete audio, not a stream
3. **No Streaming Method**: No `doGenerateStream()` or similar method
4. **Complete Audio**: Returns `audio: string | Uint8Array` (full audio file)

---

## Vercel AI SDK Streaming Support

### Text Generation (streamText)

Vercel AI SDK **does** support streaming for text generation:

```typescript
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4'),
  prompt: 'Hello',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

### Speech Generation (generateSpeech)

Vercel AI SDK **does NOT** natively support streaming for speech generation:

```typescript
import { experimental_generateSpeech as generateSpeech } from 'ai';

const result = await generateSpeech({
  model: speechModel,
  text: 'Hello',
});

// result.audio is complete Uint8Array - no streaming
```

**Key Difference**:

- `streamText()` → Returns stream
- `generateSpeech()` → Returns complete audio

---

## Conclusion: Extension Required

### ✅ **We Need to Extend SpeechModelV2**

**Reasoning**:

1. **No Native Streaming**: `SpeechModelV2` interface has no streaming method
2. **Complete Audio Only**: `doGenerate()` returns complete audio
3. **No Async Generator**: No support for chunked audio generation
4. **Provider Pattern**: Each provider implements `doGenerate()` but not streaming

### Extension Strategy

We have two options:

#### Option 1: Extend Interface (Recommended)

Create a new interface that extends `SpeechModelV2`:

```typescript
interface StreamingSpeechModelV2 extends SpeechModelV2 {
  /**
   * Generate speech in streaming chunks
   * Returns async generator that yields audio chunks
   */
  doGenerateStream?(
    options: SpeechModelV2CallOptions
  ): AsyncGenerator<Uint8Array>;
}
```

**Benefits**:

- ✅ Type-safe extension
- ✅ Optional method (backward compatible)
- ✅ Clear intent
- ✅ Can check for streaming support

**Implementation**:

```typescript
class KokoroSpeechModel implements SpeechModelV2 {
  // Existing method (required)
  async doGenerate(options: SpeechModelV2CallOptions) { ... }

  // New streaming method (optional)
  async *doGenerateStream(options: SpeechModelV2CallOptions) {
    const chunks = this.splitText(options.text, 400);

    for (const chunk of chunks) {
      const result = await this.doGenerate({
        ...options,
        text: chunk,
      });

      yield result.audio as Uint8Array;
    }
  }
}
```

#### Option 2: Type Guard Pattern

Use a type guard to check for streaming support:

```typescript
interface HasStreaming {
  doGenerateStream(
    options: SpeechModelV2CallOptions
  ): AsyncGenerator<Uint8Array>;
}

function supportsStreaming(
  model: SpeechModelV2
): model is SpeechModelV2 & HasStreaming {
  return (
    'doGenerateStream' in model && typeof model.doGenerateStream === 'function'
  );
}

// Usage
if (supportsStreaming(speechModel)) {
  const stream = speechModel.doGenerateStream(options);
  for await (const chunk of stream) {
    // Process chunk
  }
} else {
  // Fall back to non-streaming
  const result = await speechModel.doGenerate(options);
}
```

---

## Recommended Approach

### Hybrid Extension Pattern

**Best of Both Worlds**:

1. **Extend Interface**: Create `StreamingSpeechModelV2` interface
2. **Optional Method**: Make `doGenerateStream()` optional
3. **Type Guard**: Use type guard for runtime checking
4. **Fallback**: Always fall back to `doGenerate()` if streaming not available

### Implementation

```typescript
// Type definition
interface StreamingSpeechModelV2 extends SpeechModelV2 {
  doGenerateStream?(
    options: SpeechModelV2CallOptions
  ): AsyncGenerator<Uint8Array>;
}

// Type guard
function isStreamingModel(
  model: SpeechModelV2
): model is StreamingSpeechModelV2 {
  return (
    'doGenerateStream' in model && typeof model.doGenerateStream === 'function'
  );
}

// Usage in TTS Service
class TTSService {
  async speakStreaming(
    text: string,
    model: SpeechModelV2,
    options: TTSOptions
  ) {
    if (isStreamingModel(model) && model.doGenerateStream) {
      // Use streaming
      const stream = model.doGenerateStream({
        text,
        voice: options.voice,
        speed: options.speed,
      });

      // Stream to PCM processor
      for await (const chunk of stream) {
        // Process chunk
      }
    } else {
      // Fall back to non-streaming
      const result = await model.doGenerate({
        text,
        voice: options.voice,
        speed: options.speed,
      });

      // Process complete audio
    }
  }
}
```

---

## Compatibility with Vercel AI SDK

### ✅ **Fully Compatible**

**Why**:

1. **Extension, Not Replacement**: We extend the interface, not replace it
2. **Optional Method**: Streaming is optional, doesn't break existing code
3. **Backward Compatible**: Models without streaming still work
4. **Type Safe**: TypeScript ensures correct usage

### Integration with generateSpeech()

**Current Usage** (Non-streaming):

```typescript
const result = await generateSpeech({
  model: kokoro.speechModel('model-id'),
  text: 'Hello',
});
```

**With Streaming Extension** (Still compatible):

```typescript
// generateSpeech() still works (uses doGenerate)
const result = await generateSpeech({
  model: kokoro.speechModel('model-id'),
  text: 'Hello',
});

// But we can also use streaming directly
const model = kokoro.speechModel('model-id');
if (isStreamingModel(model) && model.doGenerateStream) {
  const stream = model.doGenerateStream({ text: 'Hello' });
  // Stream to PCM processor
}
```

---

## Implementation Plan

### Phase 1: Define Extension Interface

**File**: `src/lib/tts/types.ts`

```typescript
import type { SpeechModelV2, SpeechModelV2CallOptions } from '@ai-sdk/provider';

export interface StreamingSpeechModelV2 extends SpeechModelV2 {
  /**
   * Generate speech in streaming chunks
   * Optional method - models can implement for streaming support
   */
  doGenerateStream?(
    options: SpeechModelV2CallOptions
  ): AsyncGenerator<Uint8Array>;
}

export function isStreamingModel(
  model: SpeechModelV2
): model is StreamingSpeechModelV2 {
  return (
    'doGenerateStream' in model && typeof model.doGenerateStream === 'function'
  );
}
```

### Phase 2: Implement Streaming in KokoroSpeechModel

**File**: `src/lib/tts/kokoro/kokoro-speech-model.ts`

```typescript
export class KokoroSpeechModel
  implements SpeechModelV2, StreamingSpeechModelV2 {

  // Existing doGenerate (required)
  async doGenerate(options: SpeechModelV2CallOptions) { ... }

  // New streaming method (optional)
  async *doGenerateStream(options: SpeechModelV2CallOptions) {
    const chunks = this.splitText(options.text, 400);

    for (const chunk of chunks) {
      const result = await this.doGenerate({
        ...options,
        text: chunk,
      });

      yield result.audio as Uint8Array;
    }
  }
}
```

### Phase 3: Update TTS Service

**File**: `src/lib/tts/tts-service.ts`

```typescript
import { isStreamingModel } from './types';

export class TTSService {
  async speak(
    text: string,
    options: TTSOptions & { streaming?: boolean } = {}
  ) {
    const model = kokoro.speechModel(modelId);

    // Use streaming if available and requested
    if (
      options.streaming &&
      isStreamingModel(model) &&
      model.doGenerateStream
    ) {
      return this.speakStreaming(text, model, options);
    }

    // Fall back to non-streaming
    return this.speakComplete(text, model, options);
  }

  private async speakStreaming(
    text: string,
    model: StreamingSpeechModelV2,
    options: TTSOptions
  ) {
    // Setup PCM processor
    const audioContext = new AudioContext({ sampleRate: 24000 });
    await audioContext.audioWorklet.addModule('/lib/pcm-processor.js');
    const processorNode = new AudioWorkletNode(audioContext, 'pcm-processor');
    processorNode.connect(audioContext.destination);

    // Stream chunks
    const stream = model.doGenerateStream!({
      text,
      voice: options.voice,
      speed: options.speed,
    });

    for await (const chunk of stream) {
      const pcm = convertWavToPCM(chunk);
      processorNode.port.postMessage({ pcmData: pcm.buffer });
    }

    return processorNode;
  }
}
```

---

## Summary

### ✅ **Conclusion: Extension Required**

**Vercel's SpeechModelV2 does NOT natively support streaming.**

**Solution**:

- Extend `SpeechModelV2` with optional `doGenerateStream()` method
- Use type guard to check for streaming support
- Maintain backward compatibility
- Make streaming the default when available

**Benefits**:

- ✅ Type-safe extension
- ✅ Backward compatible
- ✅ Works with Vercel AI SDK
- ✅ Can make streaming default
- ✅ Easy to implement
