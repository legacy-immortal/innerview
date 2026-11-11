// Configuration service - provides typed access to all configuration
import { getEnv, type Env } from './env';

// Type definitions
export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string;
}

export interface AIConfig {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  openaiBaseURL?: string;
  zenApiKey?: string;
  nvidiaNimApiKey?: string;
  nvidiaApiKey?: string;
  nimTranscriptionModel: string;
}

export interface TTSFeatureConfig {
  enableProxy: boolean;
  enableVoiceCloning: boolean;
}

export interface StorageConfig {
  databaseUrl?: string;
  vectorDbUrl?: string;
  tursoDatabaseUrl?: string;
  tursoAuthToken?: string;
}

export interface AppConfig {
  server: ServerConfig;
  ai: AIConfig;
  tts: TTSFeatureConfig;
  storage: StorageConfig;
}

// Configuration service class
class ConfigService {
  private readonly env: Env;
  private readonly _server: ServerConfig;
  private readonly _ai: AIConfig;
  private readonly _tts: TTSFeatureConfig;
  private readonly _storage: StorageConfig;
  private readonly _openai: { apiKey?: string; baseURL?: string };
  private readonly _all: AppConfig;

  constructor() {
    this.env = getEnv();
    // Cache computed configs for performance; getters return the same
    // objects instead of allocating on every access.
    this._server = this.createServerConfig();
    this._ai = this.createAIConfig();
    this._tts = this.createTTSConfig();
    this._storage = this.createStorageConfig();
    this._openai = {
      apiKey: this.env.OPENAI_API_KEY,
      baseURL: this.env.OPENAI_BASE_URL,
    };
    this._all = {
      server: this._server,
      ai: this._ai,
      tts: this._tts,
      storage: this._storage,
    };
  }

  private createServerConfig(): ServerConfig {
    return {
      port: this.env.PORT,
      nodeEnv: this.env.NODE_ENV,
      corsOrigin: this.env.CORS_ORIGIN,
    };
  }

  private createAIConfig(): AIConfig {
    return {
      anthropicApiKey: this.env.ANTHROPIC_API_KEY,
      openaiApiKey: this.env.OPENAI_API_KEY,
      openaiBaseURL: this.env.OPENAI_BASE_URL,
      zenApiKey: this.env.ZEN_API_KEY,
      nvidiaNimApiKey: this.env.NVIDIA_NIM_API_KEY,
      nvidiaApiKey: this.env.NVIDIA_API_KEY,
      nimTranscriptionModel: this.env.NIM_TRANSCRIPTION_MODEL,
    };
  }

  private createTTSConfig(): TTSFeatureConfig {
    return {
      enableProxy: this.env.ENABLE_TTS_PROXY,
      enableVoiceCloning: this.env.ENABLE_VOICE_CLONING,
    };
  }

  private createStorageConfig(): StorageConfig {
    return {
      databaseUrl: this.env.DATABASE_URL,
      vectorDbUrl: this.env.VECTOR_DB_URL,
      tursoDatabaseUrl: this.env.TURSO_DATABASE_URL,
      tursoAuthToken: this.env.TURSO_AUTH_TOKEN,
    };
  }

  get server(): ServerConfig {
    return this._server;
  }

  get ai(): AIConfig {
    return this._ai;
  }

  get openai(): { apiKey?: string; baseURL?: string } {
    return this._openai;
  }

  get tts(): TTSFeatureConfig {
    return this._tts;
  }

  get storage(): StorageConfig {
    return this._storage;
  }

  get all(): AppConfig {
    return this._all;
  }

  // Public config (safe to expose to frontend)
  get public(): Omit<AppConfig, 'ai'> {
    return {
      server: this._server,
      tts: this._tts,
      storage: {
        // Expose only non-secret storage hints if needed; keep tokens private.
        databaseUrl: this._storage.databaseUrl,
        vectorDbUrl: this._storage.vectorDbUrl,
        tursoDatabaseUrl: this._storage.tursoDatabaseUrl,
      },
    };
  }
}

// Singleton instance
let configInstance: ConfigService | null = null;

const getConfig = (): ConfigService => {
  if (!configInstance) {
    configInstance = new ConfigService();
  }
  return configInstance;
};

// Exports
export { getConfig };
export const config = getConfig();
