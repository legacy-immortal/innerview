# Kokoro TTS Provider - Vercel ProviderV3 Implementation

## Overview

This implementation provides a Kokoro TTS provider that follows Vercel's ProviderV3 specification. It allows usage like legitimate Vercel AI SDK providers: `kokoro.speech('model-id')`.

## Architecture

```
Frontend (React + WebAssembly)
    |
    |  useVoiceSynthesis()
    |  -> kokoro (ProviderV3)
    |
    |  kokoro.speech('Kokoro-82M-v1.0-ONNX')
    |  -> SpeechModelV3
    |
    |  generateSpeech({
    |    model: speechModel,
    |    text: "Hello"
    |  })
    |
    |  -> Web Worker (Kokoro WebAssembly)
    |  -> Audio Generation
    |  -> Uint8Array Result
    |
    | Audio Playback
```

## Key Components

### 1. Kokoro SpeechModelV3 Implementation

**Location:** `src/lib/tts/kokoro-speech-model.ts`

```typescript
export class KokoroSpeechModel implements SpeechModelV3 {
  readonly specificationVersion = 'v3';
  readonly modelId: string;
  readonly provider = 'kokoro';

  async doGenerate(options: SpeechModelV3CallOptions) {
    // Uses WebAssembly Kokoro model for speech generation
    return {
      audio: audioBuffer, // Uint8Array
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: {},
        body: { success: true },
      },
      providerMetadata: {},
    };
  }
}
```

### 2. React Hook Integration

**Location:** `src/hooks/useVoiceSynthesis.ts`

```typescript
export const useVoiceSynthesis = () => {
  const [speechModel, setSpeechModel] = useState<SpeechModelV3 | null>(null);

  useEffect(() => {
    // Initialize Kokoro SpeechModelV3
    const kokoroModel = new KokoroSpeechModel('kokoro-tts', {
      modelId: 'onnx-community/Kokoro-82M-v1.0-ONNX',
      dtype: 'q8',
      device: 'wasm',
      defaultVoice: 'af_heart',
    });

    setSpeechModel(kokoroModel);
  }, []);

  return {
    speechModel, // SpeechModelV3 for generateSpeech()
    isInitializing,
    isAvailable: speechModel !== null,
  };
};
```

## Usage Examples

### Direct Vercel AI Integration

```typescript
import { experimental_generateSpeech as generateSpeech } from "ai";
import { kokoro } from "@/lib/tts";

function MyComponent() {
  const handleSpeak = async () => {
    // Get speech model from provider (exactly like Vercel SDK providers)
    const speechModel = kokoro.speech("Kokoro-82M-v1.0-ONNX");

    const result = await generateSpeech({
      model: speechModel,
      text: "Hello from Kokoro TTS!",
      voice: "af_heart",
      speed: 1.2,
    });

    // result.audio is Uint8Array - can be played or saved
    const blob = new Blob([result.audio], { type: "audio/wav" });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
  };

  return <button onClick={handleSpeak}>Speak</button>;
}
```

### Alternative: Direct Provider Usage

```typescript
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { kokoro } from '@/lib/tts';

const speakText = async (text: string) => {
  // Just like elevenlabs.speech() or openai.speech()
  const speechModel = kokoro.speech('Kokoro-82M-v1.0-ONNX');

  const { audio } = await generateSpeech({
    model: speechModel,
    text: text,
    voice: 'af_heart',
  });

  return audio; // Uint8Array
};
```

## Benefits

### ✅ **Vercel AI Compatible**

- Implements `ProviderV3` interface exactly like official Vercel providers
- Works with `kokoro.speech('model-id')` syntax
- Full Vercel AI SDK integration and patterns

### ✅ **Provider Pattern**

- Follows official Vercel provider architecture
- `kokoro.speech('Kokoro-82M-v1.0-ONNX')` returns SpeechModelV3
- Consistent with other Vercel AI SDK providers

### ✅ **Browser-Based TTS**

- Runs entirely in the browser using WebAssembly
- No server-side TTS processing required
- Fast, local speech synthesis

### ✅ **Kokoro Quality**

- High-quality neural TTS using Kokoro model
- Multiple voice options (American/British accents)
- Configurable model parameters

## Implementation Flow

1. **Provider Access**: `useVoiceSynthesis()` returns kokoro provider
2. **Model Selection**: `kokoro.speech('model-id')` gets SpeechModelV3 instance
3. **Speech Generation**: `generateSpeech()` calls `doGenerate()` method
4. **Audio Processing**: Kokoro processes text to audio via WebAssembly
5. **Result Return**: Uint8Array audio data returned to caller

## Error Handling

```typescript
try {
  const speechModel = kokoro.speech('Kokoro-82M-v1.0-ONNX');
  const { audio } = await generateSpeech({
    model: speechModel,
    text: 'Hello!',
  });

  const audioBlob = new Blob([audio], { type: 'audio/wav' });
  const audioElement = new Audio(URL.createObjectURL(audioBlob));
  audioElement.play();
} catch (error) {
  console.error('TTS generation failed:', error);
  // Handle WebAssembly initialization errors, model loading issues, etc.
}
```

## Available Models

```typescript
// Get different Kokoro models
const model82M = kokoro.speech('Kokoro-82M-v1.0-ONNX');
const model1_0B = kokoro.speech('Kokoro-1.0B-v0.19-ONNX');

// All return SpeechModelV3 instances compatible with generateSpeech()
```

This implementation provides a legitimate Vercel AI SDK provider that follows their exact specifications and patterns.
