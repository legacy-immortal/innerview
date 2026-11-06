# Voice Synthesis Options for Local Development & Production

This document outlines the available options for voice synthesis, with a focus on local development that can seamlessly transition to production-quality services.

## Architecture

The application uses a provider abstraction pattern that allows switching between different TTS providers based on environment. The main abstraction is in `src/lib/tts-providers.ts`.

## Local Development Options

### 1. Browser Web Speech API (Recommended for Quick Start)

**Pros:**

- Zero setup - built into all modern browsers
- No dependencies or external services
- Instant availability
- Free

**Cons:**

- Quality varies significantly by browser/OS
- Limited voice options
- Less natural-sounding than neural TTS
- No fine-grained control

**Usage:**

```typescript
const config: TTSConfig = {
  provider: 'browser',
  browserVoice: 'Google US English', // Optional
  browserRate: 1.0, // 0.1 to 10
  browserPitch: 1.0, // 0 to 2
};
```

**Best for:** Quick prototyping, initial development, testing UI flows

---

### 2. Piper TTS (Recommended for Quality Local Development)

**Pros:**

- High-quality neural TTS
- Fast inference (real-time capable)
- Multiple voice options
- Runs completely locally
- MIT licensed
- Small model sizes (~10-50MB per voice)

**Cons:**

- Requires setting up a local server (Python-based)
- Slightly more complex setup
- Voice quality good but not production-grade

**Setup:**

1. Install Piper TTS server:

```bash
# Option 1: Using Docker (easiest)
docker run -p 5000:5000 rhasspy/piper-tts:latest

# Option 2: Python installation
pip install piper-tts
piper-tts --model en_US-lessac-medium --port 5000
```

2. Configure in your app:

```typescript
const config: TTSConfig = {
  provider: 'piper',
  piperServerUrl: 'http://localhost:5000',
  piperVoice: 'en_US-lessac-medium', // Optional
};
```

**Best for:** Local development when you need better quality than browser TTS

---

### 3. Coqui TTS (Advanced Local Option)

**Pros:**

- Very high quality neural TTS
- Extensive voice library
- Can fine-tune models
- Supports multiple languages

**Cons:**

- Requires Python backend
- Larger models (100MB+)
- Slower inference than Piper
- More complex setup

**Setup:**
Requires a Python backend service. You'd need to create a simple Flask/FastAPI server that wraps Coqui TTS.

**Best for:** When you need the highest quality local TTS and don't mind the complexity

---

## Production Options

### 1. Microsoft Azure Cognitive Services (Current Implementation)

**Pros:**

- Production-grade quality
- Wide variety of voices
- Good latency
- Already integrated in your codebase
- SSML support for advanced control

**Cons:**

- Requires subscription key
- Costs per character
- Requires internet connection

**Usage:**

```typescript
const config: TTSConfig = {
  provider: 'azure',
  azureSubscriptionKey: process.env.AZURE_SPEECH_KEY,
  azureRegion: process.env.AZURE_SPEECH_REGION,
  azureVoiceName: 'en-US-AriaNeural', // Optional
};
```

**Best for:** Production deployment, high-quality voice synthesis

---

### 2. Amazon Polly

**Pros:**

- Excellent quality
- Neural voices available
- Good pricing
- SSML support

**Cons:**

- Requires AWS account
- Different API than Azure

**Best for:** If you're already using AWS infrastructure

---

### 3. Google Cloud Text-to-Speech

**Pros:**

- High quality
- WaveNet voices (very natural)
- Good integration with Google services

**Cons:**

- Requires GCP account
- Different API structure

**Best for:** If you're using Google Cloud Platform

---

### 4. ElevenLabs

**Pros:**

- Exceptional quality (best-in-class)
- Very natural voices
- Voice cloning available
- Good API

**Cons:**

- More expensive
- Requires API key
- Primarily cloud-based (though has some local options)

**Best for:** When quality is paramount and budget allows

---

## Recommended Development Workflow

### Phase 1: Initial Development

Use **Browser Web Speech API** for fastest iteration:

```typescript
const config: TTSConfig = {
  provider: 'browser',
};
```

### Phase 2: Quality Testing

Switch to **Piper TTS** for better quality testing:

```typescript
const config: TTSConfig = {
  provider: 'piper',
  piperServerUrl: 'http://localhost:5000',
};
```

### Phase 3: Production

Use **Azure Cognitive Services** (or your preferred cloud provider):

```typescript
const config: TTSConfig = {
  provider: 'azure',
  azureSubscriptionKey: process.env.AZURE_SPEECH_KEY,
  azureRegion: process.env.AZURE_SPEECH_REGION,
};
```

## Environment-Based Configuration

Create a configuration helper:

```typescript
// src/lib/tts-config.ts
export function getTTSConfig(): TTSConfig {
  const env = process.env.NODE_ENV;
  const provider = (process.env.TTS_PROVIDER ||
    (env === 'production' ? 'azure' : 'browser')) as TTSProvider;

  if (provider === 'azure') {
    return {
      provider: 'azure',
      azureSubscriptionKey: process.env.AZURE_SPEECH_KEY,
      azureRegion: process.env.AZURE_SPEECH_REGION,
      azureVoiceName: process.env.AZURE_VOICE_NAME,
    };
  }

  if (provider === 'piper') {
    return {
      provider: 'piper',
      piperServerUrl: process.env.PIPER_SERVER_URL || 'http://localhost:5000',
      piperVoice: process.env.PIPER_VOICE,
    };
  }

  // Default to browser for local development
  return {
    provider: 'browser',
    browserVoice: process.env.BROWSER_VOICE,
    browserRate: parseFloat(process.env.BROWSER_RATE || '1.0'),
    browserPitch: parseFloat(process.env.BROWSER_PITCH || '1.0'),
  };
}
```

## Implementation Example

```typescript
import { useVoiceSynthesis } from "@/hooks/useVoiceSynthesis";
import { getTTSConfig } from "@/lib/tts-config";

function MyComponent() {
  const ttsConfig = getTTSConfig();
  const { speak, stop, isSpeaking, isAvailable } = useVoiceSynthesis(ttsConfig);

  const handleSpeak = () => {
    speak("Hello, this is a test of voice synthesis.");
  };

  return (
    <div>
      <button onClick={handleSpeak} disabled={!isAvailable || isSpeaking}>
        {isSpeaking ? "Speaking..." : "Speak"}
      </button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}
```

## Comparison Table

| Provider    | Quality    | Setup      | Cost | Latency | Best For           |
| ----------- | ---------- | ---------- | ---- | ------- | ------------------ |
| Browser API | ⭐⭐       | ⭐⭐⭐⭐⭐ | Free | Low     | Quick dev          |
| Piper TTS   | ⭐⭐⭐⭐   | ⭐⭐⭐     | Free | Low     | Local dev          |
| Coqui TTS   | ⭐⭐⭐⭐⭐ | ⭐⭐       | Free | Medium  | Advanced local     |
| Azure       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | Paid | Low     | Production         |
| ElevenLabs  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | Paid | Low     | Premium production |

## Next Steps

1. **For immediate local development**: Use Browser Web Speech API (already implemented)
2. **For better local quality**: Set up Piper TTS server
3. **For production**: Configure Azure credentials in environment variables

The abstraction layer makes switching between providers seamless - just change the config!
