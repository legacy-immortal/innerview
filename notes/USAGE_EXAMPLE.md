# Using Vercel AI SDK with Custom Speech Models

## Overview

The `VercelAISpeechModel` implements Vercel's `SpeechModelV3` interface, allowing you to use it directly with `generateSpeech()` from the AI SDK.

## Direct Usage with generateSpeech()

```typescript
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { VercelAISpeechModel } from '@/lib/tts/providers/vercel-ai';

// Create speech model
const speechModel = new VercelAISpeechModel('eleven_multilingual_v2', {
  provider: 'elevenlabs',
  elevenLabsApiKey: 'your-key',
  elevenLabsModel: 'eleven_multilingual_v2',
});

// Use with generateSpeech
const result = await generateSpeech({
  model: speechModel,
  text: 'Hello from custom speech model!',
  voice: 'your-voice-id',
  speed: 1.2,
  providerOptions: {
    elevenlabs: {
      voice_settings: {
        stability: 0.8,
        similarity_boost: 0.8,
      },
    },
  },
});

console.log(result.audio); // Uint8Array or base64 string
```

## Via TTS Provider Service

```typescript
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';

// Configure via backend settings
const { speak, isAvailable } = useVoiceSynthesis();

// Or configure directly
const { speak } = useVoiceSynthesis({
  provider: 'vercel-ai',
  vercelAI: {
    provider: 'elevenlabs',
    elevenLabsApiKey: 'your-key',
    elevenLabsModel: 'eleven_multilingual_v2',
  },
});

await speak('Hello from TTS provider!'); // Returns Blob
```

## Model Configuration

### ElevenLabs

```typescript
const model = new VercelAISpeechModel('eleven_multilingual_v2', {
  provider: 'elevenlabs',
  elevenLabsApiKey: 'your-api-key',
  elevenLabsModel: 'eleven_multilingual_v2', // or any other model
});
```

### OpenAI

```typescript
const model = new VercelAISpeechModel('tts-1', {
  provider: 'openai',
  openaiApiKey: 'your-api-key',
  openaiModel: 'tts-1', // or 'tts-1-hd'
});
```

## Architecture

### Dual Interface Design

1. **SpeechModelV2** - Direct SDK integration with `generateSpeech()`
   - Returns `Uint8Array` or base64 `string`
   - Implements standard Vercel AI SDK interface

2. **TTSProvider** - Abstracted service interface
   - Returns `Blob` for web audio playback
   - Wraps the SpeechModelV2 for compatibility

## Benefits

1. **Direct SDK Integration** - Works with `generateSpeech()` out of the box
2. **Standard Interface** - Implements `SpeechModelV2` interface
3. **Type Safety** - Full TypeScript support
4. **Flexible** - Can be used standalone or through TTS provider service
5. **Extensible** - Easy to add new providers by implementing the same interface
