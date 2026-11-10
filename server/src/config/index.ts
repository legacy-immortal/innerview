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
}

export interface TTSFeatureConfig {
  enableProxy: boolean;
  enableVoiceCloning: boolean;
}

export interface AppConfig {
  server: ServerConfig;
  ai: AIConfig;
  tts: TTSFeatureConfig;
}

// Configuration service class
class ConfigService {
  private readonly env: Env;
  private readonly _server: ServerConfig;
  private readonly _ai: AIConfig;
  private readonly _tts: TTSFeatureConfig;
  private readonly _openai: { apiKey?: string; baseURL?: string };
  private readonly _all: AppConfig;

  constructor() {
    this.env = getEnv();
    // Cache computed configs for performance; getters return the same
    // objects instead of allocating on every access.
    this._server = this.createServerConfig();
    this._ai = this.createAIConfig();
    this._tts = this.createTTSConfig();
    this._openai = {
      apiKey: this.env.OPENAI_API_KEY,
      baseURL: this.env.OPENAI_BASE_URL,
    };
    this._all = {
      server: this._server,
      ai: this._ai,
      tts: this._tts,
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
    };
  }

  private createTTSConfig(): TTSFeatureConfig {
    return {
      enableProxy: this.env.ENABLE_TTS_PROXY,
      enableVoiceCloning: this.env.ENABLE_VOICE_CLONING,
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

  get all(): AppConfig {
    return this._all;
  }

  // Public config (safe to expose to frontend)
  get public(): Omit<AppConfig, 'ai'> {
    return {
      server: this._server,
      tts: this._tts,
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
