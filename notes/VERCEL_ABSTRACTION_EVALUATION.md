# Vercel AI SpeechModel Abstraction Evaluation

## Question

**Since we're making streaming the default, is the Vercel AI SpeechModel abstraction still useful?**

---

## Current Usage Analysis

### Where Vercel Abstraction is Used

**Only 1 place**: `src/lib/tts/tts-service.ts`

```typescript
// Line 59-64: Kokoro provider
const result = await generateSpeech({
  model: kokoro.speechModel(modelId),
  text,
  voice: getVoice(),
  speed: getSpeed(),
});
const audioData = result.audio; // Extract audio, ignore everything else

// Line 89-100: Browser provider
const result = await generateSpeech({
  model: browser.speechModel("speech-synthesis"),
  text,
  voice: getVoice(),
  speed: getSpeed(),
});
const browserAudio = result.audio; // Extract audio, ignore everything else
```

### What We Actually Use

- ✅ `result.audio` - The audio data
- ❌ `result.warnings` - Ignored
- ❌ `result.response` - Ignored
- ❌ `result.providerMetadata` - Ignored
- ❌ `generateSpeech()` validation - Minimal value

**Conclusion**: We're essentially just calling `model.doGenerate()` through a wrapper.

---

## Streaming-First Architecture Impact

### Current Flow (Non-Streaming)

```
TTSService.speak()
  → generateSpeech() [Vercel wrapper]
    → model.doGenerate() [Our implementation]
      → Returns complete audio
```

### Proposed Flow (Streaming-First)

```
TTSService.speak()
  → model.doGenerateStream() [Our implementation]
    → Stream chunks directly
      → PCM Processor
```

**Key Change**: `generateSpeech()` is **completely bypassed** for streaming.

---

## Cost-Benefit Analysis

### Costs of Keeping Vercel Abstraction

1. **Dual Implementation Required**
   ```typescript
   class KokoroSpeechModel implements SpeechModelV2 {
     // Required for Vercel compatibility
     async doGenerate() { ... }

     // Required for streaming (our extension)
     async *doGenerateStream() { ... }
   }
   ```
   - Must implement both methods
   - `doGenerate()` only used for fallback
   - `doGenerateStream()` is what we actually want

2. **Complexity**
   - Extending interface with optional methods
   - Type guards to check for streaming support
   - Maintaining compatibility we don't use

3. **Abstraction Mismatch**
   - Vercel's abstraction: Complete audio generation
   - Our need: Streaming audio chunks
   - We're fighting against the abstraction

4. **Dependency Overhead**
   - `@ai-sdk/provider` types
   - `experimental_generateSpeech` import
   - But we're not using the abstraction's benefits

### Benefits of Keeping Vercel Abstraction

1. **Standard Interface** ✅
   - Familiar to developers who know Vercel AI SDK
   - But: We're extending it anyway, so it's not standard

2. **Type Safety** ✅
   - TypeScript types from `@ai-sdk/provider`
   - But: We can define our own types

3. **Future-Proof** ⚠️
   - If Vercel adds streaming, we're ready
   - But: Unlikely to match our needs exactly

4. **Non-Streaming Fallback** ✅
   - Can still use `generateSpeech()` for fallback
   - But: If streaming is default, fallback is rare

---

## Alternative: Custom Streaming-First Abstraction

### Proposed Interface

```typescript
interface StreamingTTSModel {
  /**
   * Generate speech in streaming chunks
   * Primary method - streaming is the default
   */
  generateStream(options: TTSOptions): AsyncGenerator<Uint8Array>;

  /**
   * Generate complete audio (optional fallback)
   * Only needed for non-streaming fallback
   */
  generateComplete?(options: TTSOptions): Promise<Uint8Array>;
}

interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
  // Provider-specific options
  [key: string]: unknown;
}
```

### Benefits

1. **Streaming-First Design** ✅
   - Matches our use case perfectly
   - No need to extend or work around

2. **Simpler Implementation** ✅
   ```typescript
   class KokoroTTSModel implements StreamingTTSModel {
     async *generateStream(options: TTSOptions) {
       // Direct streaming implementation
       const chunks = this.splitText(options.text);
       for (const chunk of chunks) {
         yield await this.generateChunk(chunk, options);
       }
     }
   }
   ```

3. **No Dual Implementation** ✅
   - One primary method
   - Optional fallback if needed

4. **Better Type Safety** ✅
   - Types match our actual usage
   - No casting or type guards needed

5. **Cleaner Code** ✅
   ```typescript
   // Current (with Vercel)
   const result = await generateSpeech({ model, text });
   const audio = result.audio;

   // Proposed (custom)
   const stream = model.generateStream({ text });
   for await (const chunk of stream) { ... }
   ```

---

## Recommendation: **Drop Vercel Abstraction**

### Why?

1. **Streaming is Default**: We won't use `generateSpeech()` in normal flow
2. **Minimal Value**: We only extract `result.audio`, ignore everything else
3. **Abstraction Mismatch**: Vercel's abstraction doesn't match our needs
4. **Complexity Cost**: Maintaining dual implementation isn't worth it
5. **Better Alternative**: Custom streaming-first abstraction is simpler

### Migration Path

#### Phase 1: Create Custom Interface

```typescript
// src/lib/tts/types.ts
export interface StreamingTTSModel {
  generateStream(options: TTSOptions): AsyncGenerator<Uint8Array>;
  generateComplete?(options: TTSOptions): Promise<Uint8Array>;
}

export interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
  [key: string]: unknown;
}
```

#### Phase 2: Implement Custom Models

```typescript
// src/lib/tts/kokoro/kokoro-model.ts
export class KokoroTTSModel implements StreamingTTSModel {
  async *generateStream(options: TTSOptions) {
    const chunks = this.splitText(options.text, 400);
    for (const chunk of chunks) {
      const audio = await this.generateChunk(chunk, options);
      yield audio;
    }
  }

  async generateComplete(options: TTSOptions) {
    // Fallback implementation
    const chunks: Uint8Array[] = [];
    for await (const chunk of this.generateStream(options)) {
      chunks.push(chunk);
    }
    return this.concatAudioChunks(chunks);
  }
}
```

#### Phase 3: Update TTS Service

```typescript
// src/lib/tts/tts-service.ts
export class TTSService {
  async speak(text: string, options: TTSOptions = {}) {
    const model = this.getModel(options.provider);

    // Streaming is default
    if (model.generateStream) {
      return this.speakStreaming(text, model, options);
    }

    // Fallback to complete generation
    if (model.generateComplete) {
      return this.speakComplete(text, model, options);
    }

    throw new Error('Model does not support streaming or complete generation');
  }

  private async speakStreaming(
    text: string,
    model: StreamingTTSModel,
    options: TTSOptions
  ) {
    // Setup PCM processor
    const audioContext = new AudioContext({ sampleRate: 24000 });
    await audioContext.audioWorklet.addModule('/lib/pcm-processor.js');
    const processorNode = new AudioWorkletNode(audioContext, 'pcm-processor');
    processorNode.connect(audioContext.destination);

    // Stream chunks
    const stream = model.generateStream({ text, ...options });
    for await (const chunk of stream) {
      const pcm = convertWavToPCM(chunk);
      processorNode.port.postMessage({ pcmData: pcm.buffer });
    }

    return processorNode;
  }
}
```

#### Phase 4: Remove Vercel Dependency

- Remove `experimental_generateSpeech` import
- Remove `SpeechModelV2` implementation
- Remove `@ai-sdk/provider` dependency (if not used elsewhere)

---

## Comparison

### With Vercel Abstraction

```typescript
// Complexity: High
class KokoroSpeechModel implements SpeechModelV2 {
  async doGenerate() { ... }  // Required but rarely used
  async *doGenerateStream() { ... }  // What we actually want
}

// Usage
const result = await generateSpeech({ model, text });
const audio = result.audio;  // Extract what we need
```

### With Custom Abstraction

```typescript
// Complexity: Low
class KokoroTTSModel implements StreamingTTSModel {
  async *generateStream() { ... }  // What we want
  async generateComplete() { ... }  // Optional fallback
}

// Usage
const stream = model.generateStream({ text });
for await (const chunk of stream) { ... }  // Direct usage
```

---

## Final Verdict

### ✅ **Drop Vercel Abstraction**

**Reasons**:
1. Streaming-first architecture doesn't benefit from it
2. We're extending it anyway, defeating the purpose
3. Custom abstraction is simpler and matches our needs
4. Less code to maintain
5. Better type safety for our use case

**Keep Vercel Abstraction Only If**:
- You plan to use other Vercel AI SDK features
- You want compatibility with Vercel's ecosystem
- You need the validation/error handling from `generateSpeech()`

**For Streaming-First TTS**: Custom abstraction is better.

---

## Implementation Priority

1. **High**: Create custom `StreamingTTSModel` interface
2. **High**: Implement streaming in `KokoroTTSModel`
3. **Medium**: Update `TTSService` to use custom interface
4. **Low**: Remove Vercel abstraction (can keep for fallback initially)


