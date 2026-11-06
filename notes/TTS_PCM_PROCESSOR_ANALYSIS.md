# TTS PCM Processor Integration Analysis

## Executive Summary

**Recommendation: ✅ YES - Integrate PCM Processor for Streaming TTS**

The PCM processor would provide significant benefits for your TTS implementation, particularly for:

- **Lower latency** - Start playback immediately as audio chunks arrive
- **Better UX** - No waiting for complete audio generation
- **Memory efficiency** - Stream instead of buffering entire files
- **Real-time visualization** - Visualize audio as it's being generated

---

## Current TTS Implementation Analysis

### Architecture Overview

```
┌─────────────────────────────────────────┐
│     TTSService (tts-service.ts)        │
│  - Uses Vercel AI SDK generateSpeech() │
│  - Returns complete audio blob         │
│  - Creates HTMLAudioElement            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   KokoroSpeechModel (SpeechModelV2)     │
│  - Generates complete audio             │
│  - Returns Uint8Array (full audio)      │
│  - No streaming support                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Audio Playback                        │
│  - Blob URL → HTMLAudioElement          │
│  - MediaElementAudioSourceNode          │
│  - For visualization                    │
└─────────────────────────────────────────┘
```

### Current Flow

1. **Text Input** → `ttsService.speak(text)`
2. **Generate Speech** → `generateSpeech()` waits for complete audio
3. **Create Blob** → Convert `Uint8Array` to `Blob`
4. **Create Audio Element** → `new Audio(blobURL)`
5. **Play** → `audio.play()` (waits for full generation)

### Limitations

- ❌ **High Latency**: Must wait for complete audio generation before playback
- ❌ **Memory Usage**: Buffers entire audio file in memory
- ❌ **Poor UX for Long Text**: User waits for full generation
- ❌ **No Real-time Feedback**: Can't visualize until audio is complete
- ❌ **Chunking Not Utilized**: Kokoro splits text but doesn't stream chunks

---

## PCM Processor Capabilities

### What It Does

The `pcm-processor.js` is an **AudioWorkletProcessor** that:

1. **Receives PCM chunks** via `port.onmessage` with `pcmData`
2. **Buffers audio** in a circular buffer (~30 seconds at 24kHz)
3. **Converts formats** from 16-bit PCM to 32-bit float
4. **Streams to output** via `process()` method (called by Web Audio API)
5. **Handles incomplete samples** by buffering partial bytes
6. **Controls volume** dynamically via messages

### Key Features

- ✅ **Real-time Streaming**: Processes chunks as they arrive
- ✅ **Circular Buffer**: Efficient memory usage
- ✅ **Byte Alignment**: Handles incomplete samples gracefully
- ✅ **Volume Control**: Dynamic volume adjustment
- ✅ **Low Latency**: AudioWorklet runs in separate audio thread

---

## Benefits of Integration

### 1. **Lower Latency** ⚡

**Current**: Wait for complete audio → ~2-5 seconds for long text
**With PCM Processor**: Start playback after first chunk → ~100-300ms

**Impact**: Users hear speech almost immediately

### 2. **Better Memory Efficiency** 💾

**Current**: Buffer entire audio file (could be 1-5MB for long text)
**With PCM Processor**: Stream chunks (~128KB buffer)

**Impact**: Lower memory footprint, especially for long conversations

### 3. **Improved UX** 🎯

**Current**:

- User waits for complete generation
- No feedback during generation
- Can't interrupt until complete

**With PCM Processor**:

- Playback starts immediately
- Real-time audio visualization
- Can stop/interrupt at any time

### 4. **Real-time Visualization** 📊

**Current**: Visualization only after complete audio
**With PCM Processor**: Visualize audio as it streams

**Impact**: Better visual feedback, more engaging experience

### 5. **Better for Long Text** 📝

**Current**: Must generate entire response before speaking
**With PCM Processor**: Can start speaking while still generating

**Impact**: Especially beneficial for long AI responses

---

## Integration Architecture

### Proposed Flow

```
┌─────────────────────────────────────────┐
│     TTSService (Enhanced)               │
│  - Supports streaming mode              │
│  - Creates AudioWorklet                 │
│  - Streams chunks to processor         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   KokoroSpeechModel (Streaming)         │
│  - Generates audio in chunks            │
│  - Yields chunks via async generator    │
│  - Converts to PCM format               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   PCM Processor (AudioWorklet)          │
│  - Receives PCM chunks                  │
│  - Buffers in circular buffer           │
│  - Streams to audio output              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Audio Visualization                   │
│  - Real-time waveform                  │
│  - AnalyzerNode from AudioWorklet       │
└─────────────────────────────────────────┘
```

### Implementation Strategy

#### Option 1: Streaming Mode (Recommended)

```typescript
// Enhanced TTSService with streaming support
class TTSService {
  async speakStreaming(
    text: string,
    options: TTSOptions = {}
  ): Promise<AudioWorkletNode> {
    // 1. Create AudioContext with AudioWorklet
    const audioContext = new AudioContext({ sampleRate: 24000 });
    await audioContext.audioWorklet.addModule('/pcm-processor.js');

    // 2. Create AudioWorkletNode
    const processorNode = new AudioWorkletNode(audioContext, 'pcm-processor');
    processorNode.connect(audioContext.destination);

    // 3. Generate speech in chunks
    const speechModel = kokoro.speechModel(modelId);
    const stream = await this.generateSpeechStream(speechModel, text);

    // 4. Stream chunks to processor
    for await (const chunk of stream) {
      const pcmData = this.convertToPCM(chunk);
      processorNode.port.postMessage({ pcmData });
    }

    return processorNode;
  }

  private async *generateSpeechStream(
    model: SpeechModelV2,
    text: string
  ): AsyncGenerator<Uint8Array> {
    // Split text and generate chunks
    const chunks = this.splitText(text, 400);

    for (const chunk of chunks) {
      const result = await model.doGenerate({
        text: chunk,
        voice: 'af_heart',
      });

      yield result.audio as Uint8Array;
    }
  }
}
```

#### Option 2: Hybrid Mode (Fallback Compatible)

```typescript
// Support both streaming and non-streaming
class TTSService {
  async speak(
    text: string,
    options: TTSOptions & { streaming?: boolean } = {}
  ): Promise<HTMLAudioElement | AudioWorkletNode> {
    if (options.streaming) {
      return this.speakStreaming(text, options);
    }
    // Fall back to current implementation
    return this.speakComplete(text, options);
  }
}
```

---

## Vercel AI SDK Compatibility

### Current Interface

Vercel's `generateSpeech()` returns:

```typescript
{
  audio: string | Uint8Array;  // Complete audio
  warnings: SpeechModelV2CallWarning[];
  response: { ... };
}
```

### Streaming Extension

We can extend `SpeechModelV2` to support streaming:

```typescript
interface StreamingSpeechModelV2 extends SpeechModelV2 {
  doGenerateStream?(
    options: SpeechModelV2CallOptions
  ): AsyncGenerator<Uint8Array>;
}
```

### Implementation

```typescript
class KokoroSpeechModel implements SpeechModelV2 {
  // Existing doGenerate for compatibility
  async doGenerate(options: SpeechModelV2CallOptions) { ... }

  // New streaming method
  async *doGenerateStream(options: SpeechModelV2CallOptions) {
    const chunks = this.splitText(options.text, 400);

    for (const chunk of chunks) {
      const result = await this.generateChunk(chunk, options);
      yield result.audio as Uint8Array;
    }
  }
}
```

---

## Technical Requirements

### 1. Audio Format Conversion

**Kokoro Output**: WAV format (Uint8Array)
**PCM Processor Input**: 16-bit PCM (Int16Array)

**Conversion Needed**:

```typescript
function convertWavToPCM(wavData: Uint8Array): Int16Array {
  // Skip WAV header (44 bytes)
  const pcmData = wavData.slice(44);
  return new Int16Array(pcmData.buffer);
}
```

### 2. AudioWorklet Setup

```typescript
// Load processor module
const audioContext = new AudioContext({ sampleRate: 24000 });
await audioContext.audioWorklet.addModule('/lib/pcm-processor.js');

// Create processor node
const processorNode = new AudioWorkletNode(audioContext, 'pcm-processor');
processorNode.connect(audioContext.destination);
```

### 3. Chunk Streaming

```typescript
// Stream chunks to processor
for await (const audioChunk of speechStream) {
  const pcmChunk = convertWavToPCM(audioChunk);
  processorNode.port.postMessage({
    pcmData: pcmChunk.buffer,
  });
}
```

### 4. Visualization Integration

```typescript
// Connect analyzer for visualization
const analyser = audioContext.createAnalyser();
processorNode.connect(analyser);
analyser.connect(audioContext.destination);

// Use analyser for real-time visualization
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
```

---

## Migration Path

### Phase 1: Add Streaming Support (Non-Breaking)

1. ✅ Keep existing `speak()` method
2. ✅ Add `speakStreaming()` method
3. ✅ Add streaming support to `KokoroSpeechModel`
4. ✅ Test with PCM processor

### Phase 2: Make Streaming Default

1. ✅ Update UI to use streaming by default
2. ✅ Keep non-streaming as fallback
3. ✅ Add feature flag for streaming

### Phase 3: Full Integration

1. ✅ Remove non-streaming code (if desired)
2. ✅ Optimize chunk sizes
3. ✅ Add error recovery

---

## Code Changes Required

### 1. Create Streaming TTS Service

**File**: `src/lib/tts/tts-service-streaming.ts`

```typescript
export class StreamingTTSService {
  private audioContext: AudioContext | null = null;
  private processorNode: AudioWorkletNode | null = null;

  async initialize() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    await this.audioContext.audioWorklet.addModule(
      new URL('../../tts/lib/pcm-processor.js', import.meta.url)
    );
  }

  async speakStreaming(text: string, options: TTSOptions) {
    if (!this.audioContext) await this.initialize();

    const processorNode = new AudioWorkletNode(
      this.audioContext!,
      'pcm-processor'
    );
    processorNode.connect(this.audioContext!.destination);

    // Generate and stream chunks
    const model = kokoro.speechModel(modelId);
    const stream = this.generateStream(model, text, options);

    for await (const chunk of stream) {
      const pcm = convertWavToPCM(chunk);
      processorNode.port.postMessage({ pcmData: pcm.buffer });
    }

    return processorNode;
  }
}
```

### 2. Enhance KokoroSpeechModel

**File**: `src/lib/tts/kokoro/kokoro-speech-model.ts`

```typescript
export class KokoroSpeechModel implements SpeechModelV2 {
  // Add streaming method
  async *doGenerateStream(
    options: SpeechModelV2CallOptions
  ): AsyncGenerator<Uint8Array> {
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

### 3. Update TTSService

**File**: `src/lib/tts/tts-service.ts`

```typescript
export class TTSService {
  private streamingService = new StreamingTTSService();

  async speak(
    text: string,
    options: TTSOptions & { streaming?: boolean } = {}
  ) {
    if (options.streaming) {
      return this.streamingService.speakStreaming(text, options);
    }

    // Existing non-streaming implementation
    return this.speakComplete(text, options);
  }
}
```

---

## Performance Comparison

### Current Implementation

- **Latency**: 2-5 seconds (wait for complete generation)
- **Memory**: 1-5MB per audio file
- **UX**: Wait → Play → Visualize

### With PCM Processor

- **Latency**: 100-300ms (first chunk)
- **Memory**: ~128KB buffer
- **UX**: Generate → Stream → Play → Visualize (simultaneous)

---

## Recommendations

### ✅ **DO Integrate PCM Processor**

**Reasons**:

1. Significant latency improvement
2. Better user experience
3. Lower memory usage
4. Enables real-time visualization
5. Compatible with Vercel AI SDK (via extension)

### Implementation Priority

1. **High**: Add streaming support to `KokoroSpeechModel`
2. **High**: Create `StreamingTTSService` wrapper
3. **Medium**: Integrate PCM processor
4. **Medium**: Update visualization to work with streaming
5. **Low**: Make streaming default (keep fallback)

### Compatibility Strategy

- ✅ Keep existing `speak()` method for backward compatibility
- ✅ Add `speakStreaming()` as new method
- ✅ Use feature flag to enable/disable streaming
- ✅ Fall back to non-streaming if AudioWorklet not supported

---

## Conclusion

The PCM processor integration would provide **significant benefits** with **minimal breaking changes**. The implementation is **compatible with Vercel AI SDK** through extension methods, and provides a **better user experience** with lower latency and real-time visualization.

**Recommendation**: Proceed with integration using the hybrid approach (streaming + fallback).
