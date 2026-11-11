// Environment variable loader and validator
import { config as loadDotenv } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { resolveOpenCodeApiKey } from './opencode-auth.js';

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

// Schema for all environment variables
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3002),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),

  // AI Services
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  NVIDIA_NIM_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  ZEN_API_KEY: z.string().optional(),
  /** NVIDIA NIM speech-to-text model for server-side transcription. */
  NIM_TRANSCRIPTION_MODEL: z.string().default('nvidia/parakeet-ctc-1.1b-asr'),

  // TTS Feature Flags
  ENABLE_TTS_PROXY: z.coerce.boolean().default(false),
  ENABLE_VOICE_CLONING: z.coerce.boolean().default(false),

  // Storage
  DATABASE_URL: z.string().optional(),
  VECTOR_DB_URL: z.string().optional(),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Fill missing AI credentials from opencode's auth store (env vars win). */
function applyOpenCodeAuthFallbacks(env: Env): Env {
  const needsAnthropic = !env.ANTHROPIC_API_KEY?.trim();
  const needsOpenAI = !env.OPENAI_API_KEY?.trim();
  const needsZen = !env.ZEN_API_KEY?.trim();
  if (!needsAnthropic && !needsOpenAI && !needsZen) return env;
  return {
    ...env,
    ANTHROPIC_API_KEY: needsAnthropic
      ? (resolveOpenCodeApiKey(['anthropic']) ?? env.ANTHROPIC_API_KEY)
      : env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: needsOpenAI
      ? (resolveOpenCodeApiKey(['openai']) ?? env.OPENAI_API_KEY)
      : env.OPENAI_API_KEY,
    ZEN_API_KEY: needsZen
      ? (resolveOpenCodeApiKey(['opencode', 'zen', 'opencode-zen']) ??
        env.ZEN_API_KEY)
      : env.ZEN_API_KEY,
  };
}

function resolveNvidiaApiKey(env: Env): string | undefined {
  const direct = env.NVIDIA_NIM_API_KEY?.trim() || env.NVIDIA_API_KEY?.trim();
  if (direct) return direct;
  return resolveOpenCodeApiKey(['nvidia', 'nvidia-nim', 'nim']);
}

/**
 * If OpenAI credentials/endpoint are not configured or detected, fall back to
 * NVIDIA NIM (OpenAI-compatible) key/endpoint. Explicit user-configured OpenAI
 * keys or base URLs are never overridden.
 */
function applyNvidiaFallbacks(env: Env, hadExplicitOpenAIKey: boolean): Env {
  let openaiApiKey = env.OPENAI_API_KEY?.trim() || undefined;
  let openaiBaseURL = env.OPENAI_BASE_URL?.trim() || undefined;

  if (!openaiApiKey) {
    openaiApiKey = resolveNvidiaApiKey(env);
  }

  if (
    !hadExplicitOpenAIKey &&
    !openaiBaseURL &&
    openaiApiKey &&
    (env.NVIDIA_NIM_API_KEY?.trim() ||
      env.NVIDIA_API_KEY?.trim() ||
      resolveOpenCodeApiKey(['nvidia', 'nvidia-nim', 'nim']))
  ) {
    openaiBaseURL = NVIDIA_BASE_URL;
  }

  return {
    ...env,
    OPENAI_API_KEY: openaiApiKey ?? env.OPENAI_API_KEY,
    OPENAI_BASE_URL: openaiBaseURL ?? env.OPENAI_BASE_URL,
  };
}

function loadEnvFile(): void {
  if (process.env.NODE_ENV === 'production') return;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // .env is at project root (3 levels up from server/src/config/)
  const envPath = join(__dirname, '../../../.env');
  loadDotenv({ path: envPath });
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  return `Environment validation failed:\n${issues}\n\nCheck your .env file or environment variables.`;
}

/**
 * Load and validate environment variables.
 * Called once by ConfigService - no caching needed here since ConfigService is a singleton.
 */
export function getEnv(): Env {
  loadEnvFile();

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(formatValidationError(result.error));
  }
  const hadExplicitOpenAIKey = !!process.env.OPENAI_API_KEY?.trim();
  const withOpenCode = applyOpenCodeAuthFallbacks(result.data);
  return applyNvidiaFallbacks(withOpenCode, hadExplicitOpenAIKey);
}
