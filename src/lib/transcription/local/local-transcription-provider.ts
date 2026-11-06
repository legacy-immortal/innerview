// Local Transcription Provider - For development/local use
// Browser-based transcription uses @built-in-ai/transformers-js via transformersJS.transcription()
// Supports backend (faster-whisper) transcription as fallback
import { NoSuchModelError } from '@ai-sdk/provider';
import type {
  ProviderV2 as AIProviderV2,
  TranscriptionModelV2,
} from '@ai-sdk/provider';
import { LocalTranscriptionModel } from './local-transcription-model';
import { LocalTranscriptionConfig } from './local-transcription-config';

export const LOCAL_TRANSCRIPTION_MODELS = [
  'whisper-browser',
  'whisper-backend',
] as const;
export type LocalTranscriptionModelId =
  (typeof LOCAL_TRANSCRIPTION_MODELS)[number];

/**
 * Local Transcription Provider implementing Vercel's ProviderV2 interface
 * Uses @built-in-ai/transformers-js for browser-based transcription (Transformers.js)
 * Supports backend (faster-whisper) transcription as fallback
 */
export class LocalTranscriptionProvider implements AIProviderV2 {
  readonly specificationVersion = 'v2' as const;

  private models = new Map<string, TranscriptionModelV2>();
  private config: LocalTranscriptionConfig;

  constructor(config?: Partial<LocalTranscriptionConfig>) {
    this.config = {
      mode: config?.mode || 'browser',
      backendUrl: config?.backendUrl || '/api/transcription',
      modelId: config?.modelId || 'Xenova/whisper-base',
      quantized: config?.quantized !== false,
      ...config,
    };
  }

  /**
   * Returns the transcription model with the given id.
   * @param modelId - 'whisper-browser' for browser-based (Transformers.js) or 'whisper-backend' for backend
   * @returns TranscriptionModelV2 instance
   * @throws {NoSuchModelError} If the model is not available
   */
  transcriptionModel(modelId: string): TranscriptionModelV2 {
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
      modelType: 'textEmbeddingModel',
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

// Singleton instance
let localTranscriptionProvider: LocalTranscriptionProvider | null = null;

export function getLocalTranscriptionProvider(
  config?: Partial<LocalTranscriptionConfig>
): LocalTranscriptionProvider {
  if (!localTranscriptionProvider || config) {
    localTranscriptionProvider = new LocalTranscriptionProvider(config);
  }
  return localTranscriptionProvider;
}

// Export the provider instance for easy access
export const localTranscription = getLocalTranscriptionProvider();
