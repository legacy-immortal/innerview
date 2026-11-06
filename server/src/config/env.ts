// Environment variable loader and validator
import { config as loadDotenv } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

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
  ZEN_API_KEY: z.string().optional(),

  // TTS Feature Flags
  ENABLE_TTS_PROXY: z.coerce.boolean().default(false),
  ENABLE_VOICE_CLONING: z.coerce.boolean().default(false),

  // Storage (future)
  DATABASE_URL: z.string().optional(),
  VECTOR_DB_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

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
  return result.data;
}
