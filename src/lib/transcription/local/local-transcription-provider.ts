/**
 * @file local-transcription-provider.ts — Local transcription provider (browser/backend).
 * @module lib/transcription/local/local-transcription-provider
 *
 * Local Transcription Provider for development/local use. Implements Vercel's
 * ProviderV2 interface, using @built-in-ai/transformers-js for browser-based
 * transcription (Transformers.js) and faster-whisper via API for backend
 * transcription. The browser model is opt-in only and never auto-loads
 * post-bootstrap.
 */
import { NoSuchModelError } from '@ai-sdk/provider';
import type {
  ProviderV2 as AIProviderV2,
  TranscriptionModelV2,
} from '@ai-sdk/provider';
import { LocalTranscriptionModel } from './local-transcription-model';
import { LocalTranscriptionConfig } from './local-transcription-config';

/** Supported local transcription model ids. */
export const LOCAL_TRANSCRIPTION_MODELS = [
  'whisper-browser',
  'whisper-backend',
] as const;

/** Union of supported local transcription model id literal types. */
export type LocalTranscriptionModelId =
  (typeof LOCAL_TRANSCRIPTION_MODELS)[number];

/**
 * Local Transcription Provider implementing Vercel's ProviderV2 interface.
 * Uses @built-in-ai/transformers-js for browser-based transcription
 * (Transformers.js). Supports backend (faster-whisper) transcription as
 * fallback. Caches created models by id.
 */
export class LocalTranscriptionProvider implements AIProviderV2 {
  readonly specificationVersion = 'v2' as const;

  private models = new Map<string, TranscriptionModelV2>();
  private readonly config: LocalTranscriptionConfig;

  constructor(config?: Partial<LocalTranscriptionConfig>) {
    this.config = {
      mode: config?.mode || 'browser',
      backendUrl: config?.backendUrl || '/api/transcription',
      modelId: config?.modelId || 'Xenova/whisper-base',
      quantized: config?.quantized !== false,
      ...config,
      // `...config` must not silently re-enable loading: force the
      // normalized boolean (true only when explicitly opted in).
      allowBrowserModelLoad: config?.allowBrowserModelLoad === true,
    };
  }

  /**
   * Returns the transcription model with the given id.
   * @param modelId - 'whisper-browser' for browser-based (Transformers.js) or 'whisper-backend' for backend
   * @returns TranscriptionModelV2 instance
   * @throws {NoSuchModelError} If the model is not available
   */
  public transcriptionModel(modelId: string): TranscriptionModelV2 {
    if (
      !LOCAL_TRANSCRIPTION_MODELS.includes(modelId as LocalTranscriptionModelId)
    ) {
      throw new NoSuchModelError({
        modelId,
        modelType: 'transcriptionModel',
        message: `Local provider only supports: ${LOCAL_TRANSCRIPTION_MODELS.join(', ')}`,
      });
    }

    // Check if we already have this model cached
    if (this.models.has(modelId)) {
      return this.models.get(modelId)!;
    }

    // Determine the actual mode based on modelId
    const mode = modelId === 'whisper-backend' ? 'backend' : 'browser';

    let model: TranscriptionModelV2;

    if (mode === 'browser') {
      // Browser mode: Uses transformersJS.transcription() from @built-in-ai/transformers-js
      // The LocalTranscriptionModel handles browser transcription via transformersJS.transcription()
      model = new LocalTranscriptionModel(modelId, {
        ...this.config,
        mode: 'browser',
      });
    } else {
      // Use custom backend model wrapper
      model = new LocalTranscriptionModel(modelId, {
        ...this.config,
        mode,
      });
    }

    this.models.set(modelId, model);
    return model;
  }

  /**
   * Set the browser-model opt-in flag on the provider and all cached models.
   * Only call this after the user explicitly opts into browser transcription.
   * Newly created browser models inherit this flag via `this.config`.
   * @param allowed - Whether browser-model download is now allowed.
   */
  public setAllowBrowserModelLoad(allowed: boolean): void {
    this.config.allowBrowserModelLoad = allowed;
    for (const model of this.models.values()) {
      if (model instanceof LocalTranscriptionModel) {
        model.setAllowBrowserModelLoad(allowed);
      }
    }
  }

  // Required by ProviderV2 interface but not implemented for Local Transcription
  languageModel(modelId: string): never {
    throw new NoSuchModelError({
      modelId,
      modelType: 'languageModel',
      message: `Local transcription provider does not support language models. Requested: ${modelId}`,
    });
  }

  textEmbeddingModel(modelId: string): never {
    throw new NoSuchModelError({
      modelId,
      modelType: 'embeddingModel',
      message: `Local transcription provider does not support embedding models. Requested: ${modelId}`,
    });
  }

  imageModel(modelId: string): never {
    throw new NoSuchModelError({
      modelId,
      modelType: 'imageModel',
      message: `Local transcription provider does not support image models. Requested: ${modelId}`,
    });
  }

  speechModel(modelId: string): never {
    throw new NoSuchModelError({
      modelId,
      modelType: 'speechModel',
      message: `Local transcription provider does not support speech models. Requested: ${modelId}`,
    });
  }
}

// Singleton instance (created lazily on first access)
let localTranscriptionProvider: LocalTranscriptionProvider | null = null;

/**
 * Get (or create with config) the singleton local transcription provider.
 * Reuses the existing instance unless a config is supplied, in which case a
 * new provider is created. @param config - Optional partial config to create
 * a new provider with.
 * @returns The local transcription provider instance.
 */
export function getLocalTranscriptionProvider(
  config?: Partial<LocalTranscriptionConfig>
): LocalTranscriptionProvider {
  if (!localTranscriptionProvider || config) {
    localTranscriptionProvider = new LocalTranscriptionProvider(config);
  }
  return localTranscriptionProvider;
}

// Export the provider instance for easy access (default config)
export const localTranscription = getLocalTranscriptionProvider();
