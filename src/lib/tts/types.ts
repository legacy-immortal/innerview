/**
 * @file types.ts — Streaming-first TTS contracts: options, model interface, type guards.
 * @module lib/tts/types
 *
 * Streaming-first TTS contracts. Defines the options shape, the
 * StreamingTTSModel interface implemented by Kokoro and browser models, and
 * type guards used by the TTS service to select a provider model.
 */

/**
 * Options for TTS generation.
 * Includes an index signature so provider-specific options (pitch, chunkLength,
 * etc.) can be passed through without casting.
 */
export interface TTSOptions {
  /** Text to synthesize. */
  text: string;
  /** Voice id to use. */
  voice?: string;
  /** Speaking rate multiplier (1.0 = normal). */
  speed?: number;
  /** Provider: 'kokoro' or 'browser'. */
  provider?: 'kokoro' | 'browser';
  /** Provider-specific passthrough options. */
  [key: string]: unknown;
}

/**
 * Streaming TTS Model interface.
 * Primary method is streaming; complete generation is an optional fallback
 * for non-streaming scenarios. Implemented by KokoroTTSModel and
 * BrowserTTSModel.
 */
export interface StreamingTTSModel {
  /**
   * Generate speech in streaming chunks.
   * Primary method — streaming is the default.
   * @param options - TTS options including text, voice, and speed.
   * @yields PCM audio chunks as Uint8Array.
   */
  generateStream(options: TTSOptions): AsyncGenerator<Uint8Array>;

  /**
   * Generate complete audio (optional fallback).
   * Only needed for non-streaming fallback scenarios.
   * @param options - TTS options including text, voice, and speed.
   * @returns Complete audio as a Uint8Array.
   */
  generateComplete?(options: TTSOptions): Promise<Uint8Array>;

  /** Model identifier. */
  readonly modelId: string;

  /** Provider name. */
  readonly provider: string;
}

/**
 * Type guard to check if a model supports streaming.
 * Narrows `unknown` to StreamingTTSModel by checking for a callable
 * `generateStream` method.
 * @param model - Value to test.
 * @returns True when the value is a StreamingTTSModel.
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
 * Type guard to check if a model supports complete generation.
 * Narrows StreamingTTSModel to one with a callable `generateComplete`.
 * @param model - StreamingTTSModel to test.
 * @returns True when the model also exposes generateComplete.
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

