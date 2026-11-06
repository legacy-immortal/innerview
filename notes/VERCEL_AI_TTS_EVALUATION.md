# Vercel AI SDK TTS Provider - Evaluation & Implementation

## Summary

I've successfully integrated Vercel's AI SDK `generateSpeech()` function as a new TTS provider option. This provides a unified interface for ElevenLabs and OpenAI TTS through Vercel's well-maintained SDK.

## Implementation

### New Provider: `vercel-ai`

**Location:** `src/lib/tts/providers/vercel-ai.ts`

**Features:**

- ✅ Supports both ElevenLabs and OpenAI TTS
- ✅ Uses Vercel's unified `generateSpeech()` API
- ✅ Automatic voice loading (ElevenLabs API + OpenAI fixed voices)
- ✅ Full voice settings support (stability, similarity boost, etc.)
- ✅ Language code support
- ✅ Speed control
- ✅ Output format selection

### Benefits

1. **Unified API:** Single interface for multiple providers
2. **Well-Maintained:** Vercel actively maintains the SDK
3. **Type Safety:** Full TypeScript support
4. **Future-Proof:** Easy to add more providers as Vercel adds them
5. **Consistent:** Same API patterns as the rest of the AI SDK

### Configuration

```typescript
// ElevenLabs via Vercel AI SDK
const config: TTSProviderConfig = {
  provider: 'vercel-ai',
  vercelAI: {
    provider: 'elevenlabs',
    elevenLabsApiKey: 'your-key',
    elevenLabsModel: 'eleven_multilingual_v2',
    elevenLabsVoiceId: 'voice-id',
    speed: 1.0,
    language: 'en',
  },
};

// OpenAI via Vercel AI SDK
const config: TTSProviderConfig = {
  provider: 'vercel-ai',
  vercelAI: {
    provider: 'openai',
    openaiApiKey: 'your-key',
    openaiModel: 'tts-1',
    openaiVoice: 'alloy',
    speed: 1.0,
  },
};
```

### Comparison: Direct ElevenLabs vs Vercel AI SDK

| Feature              | Direct ElevenLabs | Vercel AI SDK       |
| -------------------- | ----------------- | ------------------- |
| **API Complexity**   | Direct API calls  | Unified SDK         |
| **Provider Support** | ElevenLabs only   | ElevenLabs + OpenAI |
| **Maintenance**      | Manual updates    | Vercel maintains    |
| **Type Safety**      | Manual types      | Full SDK types      |
| **Future Providers** | Manual addition   | Auto-available      |
| **Voice Cloning**    | ✅ Supported      | ❌ Not in SDK yet   |

### Recommendation

**Use Vercel AI SDK provider when:**

- ✅ You want a unified interface
- ✅ You might switch between providers
- ✅ You want maintained, type-safe code
- ✅ You don't need voice cloning (yet)

**Use Direct ElevenLabs provider when:**

- ✅ You need voice cloning features
- ✅ You need fine-grained control
- ✅ You want to avoid SDK dependencies

### Migration Path

The direct ElevenLabs provider remains available. You can:

1. Use `vercel-ai` for new implementations
2. Keep existing `elevenlabs` provider for voice cloning
3. Switch between them via configuration

### Next Steps

1. ✅ Provider implemented
2. ✅ Types updated
3. ✅ Factory updated
4. ✅ Backend settings support added
5. ⏳ Test with actual API keys
6. ⏳ Add to documentation

## Usage Example

```typescript
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';

// Using Vercel AI SDK with ElevenLabs
const { speak, isAvailable } = useVoiceSynthesis({
  provider: 'vercel-ai',
  vercelAI: {
    provider: 'elevenlabs',
    elevenLabsApiKey: 'your-key',
    elevenLabsVoiceId: 'voice-id',
  },
});

await speak('Hello from Vercel AI SDK!');
```
