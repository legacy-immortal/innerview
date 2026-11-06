import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZEN_BASE_URL } from './agents/index.js';
import { config } from './config/index.js';
import chatRoutes from './routes/chat.js';
import completionRoutes from './routes/openai.js';
import transcriptionRoutes from './routes/transcription.js';

// Initialize config (validates environment variables on startup)
try {
  void config.all; // Access to trigger validation
} catch (error) {
  console.error('Configuration error:', error);
  process.exit(1);
}

const app = new Hono();

// CORS middleware
app.use(
  '*',
  cors({
    origin: config.server.corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Session-Id'],
  })
);

// Mount routes
app.route('/', chatRoutes);
app.route('/', transcriptionRoutes);
app.route('/', completionRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test audio proxy - fetches external audio files to bypass CORS
// All samples must contain spoken dialog for Whisper transcription testing
const TEST_AUDIO_URLS: Record<string, string> = {
  // JFK "Ask not what your country can do for you" - ~11s WAV, clear speech
  jfk: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav',
  // MLK speech excerpt - FLAC format
  mlk: 'https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac',
  // LibriVox poetry reading - longer spoken audio
  librivox:
    'https://ia800204.us.archive.org/11/items/short_poetry_collection_001_librivox/spCollection001_01_various_64kb.mp3',
};

app.get('/api/test-audio/:sampleId', async (c) => {
  const sampleId = c.req.param('sampleId');
  const url = TEST_AUDIO_URLS[sampleId];

  if (!url) {
    return c.json(
      {
        error: 'Invalid sample ID',
        validSamples: Object.keys(TEST_AUDIO_URLS),
      },
      400
    );
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return c.json(
        { error: `Failed to fetch audio: ${response.statusText}` },
        response.status as 400 | 404 | 500
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'audio/mpeg';

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Proxy fetch failed: ${errorMessage}` }, 500);
  }
});

// Local provider endpoints to scan (OpenAI-compatible /v1)
const LOCAL_PROVIDER_PRESETS = [
  { name: 'LM Studio', baseURL: 'http://localhost:1234/v1' },
  { name: 'Ollama', baseURL: 'http://localhost:11434/v1' },
  { name: 'Open WebUI', baseURL: 'http://localhost:8080/v1' },
  { name: 'Text Generation WebUI', baseURL: 'http://localhost:5000/v1' },
  { name: 'Local (port 5001)', baseURL: 'http://localhost:5001/v1' },
];

async function probeProvider(baseURL: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: { Authorization: 'Bearer sk-proj-dummy' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

// Scan for available local providers
app.get('/api/provider/scan', async (c) => {
  const results: Array<{ name: string; baseURL: string }> = [];
  for (const preset of LOCAL_PROVIDER_PRESETS) {
    const ok = await probeProvider(preset.baseURL);
    if (ok) results.push({ name: preset.name, baseURL: preset.baseURL });
  }
  return c.json({ providers: results, timestamp: new Date().toISOString() });
});

// Provider status endpoint - checks if AI provider is available
app.get('/api/provider/status', async (c) => {
  const baseURL = config.ai.openaiBaseURL || 'http://localhost:5001/v1';
  const providerType = config.ai.openaiBaseURL ? 'remote' : 'local';

  try {
    // Try to reach the provider's models endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.ai.openaiApiKey || 'sk-proj-dummy'}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data || [];
      return c.json({
        status: 'available',
        provider: providerType,
        baseURL,
        modelsAvailable: models.length,
        models: models.slice(0, 10).map((m: { id: string }) => m.id),
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({
      status: 'error',
      provider: providerType,
      baseURL,
      error: `Provider returned status ${response.status}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const isTimeout =
      errorMessage.includes('abort') || errorMessage.includes('timeout');
    const isConnectionRefused =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('fetch failed');

    return c.json({
      status: 'unavailable',
      provider: providerType,
      baseURL,
      error: isTimeout
        ? 'Connection timeout - provider not responding'
        : isConnectionRefused
          ? 'Connection refused - provider not running'
          : errorMessage,
      suggestion:
        providerType === 'local'
          ? 'Start a local LLM server (e.g., LM Studio, Ollama) on port 5001, or configure OPENAI_BASE_URL in server/.env'
          : 'Check your API key and network connection',
      timestamp: new Date().toISOString(),
    });
  }
});

// Test provider connection (used by settings modal). Zen uses ZEN_API_KEY from env.
app.post('/api/provider/test', async (c) => {
  try {
    const body = (await c.req.json()) as { baseURL?: string; apiKey?: string };
    let baseURL = (body.baseURL ?? '').trim().replace(/\/+$/, '');
    if (!baseURL) {
      return c.json({ ok: false, error: 'Base URL is required' }, 400);
    }
    if (!baseURL.endsWith('/v1')) baseURL += '/v1';
    const isZen =
      baseURL.replace(/\/+$/, '') === ZEN_BASE_URL.replace(/\/+$/, '');
    const apiKey = isZen ? config.ai.zenApiKey : body.apiKey?.trim();
    const authHeader = apiKey ? `Bearer ${apiKey}` : 'Bearer sk-proj-dummy';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return c.json({
        ok: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      });
    }

    const data = (await response.json()) as
      | { data?: Array<{ id?: string }> }
      | Array<{ id?: string }>
      | { models?: Array<{ id?: string }> };
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { data?: unknown }).data)
        ? (data as { data: Array<{ id?: string }> }).data
        : Array.isArray((data as { models?: unknown }).models)
          ? (data as { models: Array<{ id?: string }> }).models
          : [];
    const models = list
      .map((m) => m?.id)
      .filter((id): id is string => typeof id === 'string');
    return c.json({ ok: true, baseURL, models });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ ok: false, error: message }, 500);
  }
});

serve(
  {
    fetch: app.fetch,
    port: config.server.port,
  },
  (info) => {
    console.log(`Server is running on port ${info.port}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
    console.log(`CORS origin: ${config.server.corsOrigin}`);
  }
);
