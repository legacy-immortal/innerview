/**
 * @file Streaming-first TTS contracts: options, model interface, and type guards.
 * @module lib/tts/types.ts
 */
// Streaming-first TTS types and interfaces

export interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
  provider?: 'kokoro' | 'browser';
  [key: string]: unknown;
}

/**
 * Streaming TTS Model interface
 * Primary method is streaming - complete generation is optional fallback
 */
export interface StreamingTTSModel {
  /**
   * Generate speech in streaming chunks
   * Primary method - streaming is the default
   */
  generateStream(options: TTSOptions): AsyncGenerator<Uint8Array>;

  /**
   * Generate complete audio (optional fallback)
   * Only needed for non-streaming fallback scenarios
   */
  generateComplete?(options: TTSOptions): Promise<Uint8Array>;

  /**
   * Model identifier
   */
  readonly modelId: string;

  /**
   * Provider name
   */
  readonly provider: string;
}

/**
 * Type guard to check if model supports streaming
 */
export function isStreamingModel(
  model: unknown
): model is StreamingTTSModel {
  return (
    typeof model === 'object' &&
    model !== null &&
    'generateStream' in model &&
    typeof (model as StreamingTTSModel).generateStream === 'function'
  );
}

/**
 * Type guard to check if model supports complete generation
 */
export function supportsCompleteGeneration(
  model: StreamingTTSModel
): model is StreamingTTSModel & {
  generateComplete: (options: TTSOptions) => Promise<Uint8Array>;
} {
  return (
    'generateComplete' in model &&
    typeof model.generateComplete === 'function'
  );
}

