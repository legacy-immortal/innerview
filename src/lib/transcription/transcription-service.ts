/**
 * @file transcription-service.ts — Transcription service dispatching to OpenAI or local providers.
 * @module lib/transcription/transcription-service
 *
 * Transcription Service using Vercel AI SDK with multiple providers. Routes
 * transcription requests to OpenAI (whisper-1) or the local provider
 * (browser Transformers.js or backend faster-whisper) based on options and
 * stored settings. Consumed by the transcription hook and test flows.
 */
import { openai } from '@ai-sdk/openai';
import {
  experimental_transcribe as transcribe,
  type TranscriptionModel,
} from 'ai';
import { useSettingsStore } from '../settings-store';
import { localTranscription } from './local';

/**
 * Options for a transcription call.
 * Provider, model, language, and task default to stored settings when not
 * supplied, with explicit options taking precedence.
 */
export interface TranscriptionOptions {
  /** Language hint in ISO-639-1 (e.g. 'en'). */
  language?: string;
  /** Provider: 'openai' or 'local'. */
  provider?: 'openai' | 'local';
  /** Model id to transcribe with. */
  modelId?: string;
  /** Timestamp granularities for word/segment-level timestamps. */
  timestampGranularities?: ('word' | 'segment')[];
  /** Task: 'transcribe' or 'translate'. */
  task?: 'transcribe' | 'translate';
}

/**
 * Result of a transcription call.
 */
export interface TranscriptionResult {
  /** Transcribed text. */
  text: string;
  /** Optional segments with start/end seconds. */
  segments?: Array<{
    text: string;
    startSecond: number;
    endSecond: number;
  }>;
  /** Duration in seconds, when available. */
  duration?: number;
}

/**
 * Transcription service dispatching to OpenAI or local providers.
 * Owns provider selection and settings merging; exposes a single transcribe
 * method used by the transcription hook and test utilities.
 */
export class TranscriptionService {
  /**
   * Transcribe audio using the selected provider.
   * Merges provided options with stored settings (options take precedence),
   * then routes to OpenAI or the local provider. The local browser model is
   * opt-in only and never auto-loads post-bootstrap.
   * @param audio - Audio data as Uint8Array, ArrayBuffer, or Blob.
   * @param options - Transcription options (provider, model, language, etc.).
   * @returns Transcription result with text, segments, and duration.
   * @throws When the provider is unknown or transcription fails.
   */
  public async transcribe(
    audio: Uint8Array | ArrayBuffer | Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // Get settings from store (merge with provided options, options take precedence)
    const store = useSettingsStore.getState();
    const settings = store.getTranscriptionSettings();

    const provider = options.provider || settings?.provider || 'openai';

    try {
      if (provider === 'openai') {
        const modelId =
          options.modelId ||
          settings?.openai?.modelId ||
          settings?.modelId ||
          'whisper-1';
        const language =
          options.language || settings?.openai?.language || settings?.language;
        const timestampGranularities = options.timestampGranularities ||
          settings?.openai?.timestampGranularities ||
          settings?.timestampGranularities || ['segment'];

        const model = openai.transcription(
          modelId
        ) as unknown as TranscriptionModel;
        const result = await transcribe({
          model,
          audio: audio as Uint8Array,
          providerOptions: {
            openai: {
              ...(language && { language }),
              timestampGranularities,
            },
          },
        });

        return {
          text: result.text,
          segments: result.segments,
          duration: result.durationInSeconds,
        };
      } else if (provider === 'local') {
        // Default to the bootstrap-loaded backend model. The browser
        // (Transformers.js) model is opt-in only and must never auto-load
        // post-bootstrap: it requires an explicit `mode: 'browser'` in
        // settings AND `allowBrowserModelLoad` via the dedicated loading
        // phase (LocalTranscriptionModel.ensureBrowserModelLoaded).
        const localSettings = settings?.local;
        const mode = localSettings?.mode || 'backend';
        const modelId =
          options.modelId ||
          (mode === 'browser' ? 'whisper-browser' : 'whisper-backend');

        // Note: Local provider settings (modelId, quantized, language, task) are
        // configured at provider initialization. For now, we use the default provider.
        // TODO: Recreate provider with settings when they change
        const result = await transcribe({
          model: localTranscription.transcriptionModel(modelId),
          audio: audio as Uint8Array,
        });

        return {
          text: result.text,
          segments: result.segments,
          duration: result.durationInSeconds,
        };
      }

      throw new Error(`Unknown transcription provider: ${provider}`);
    } catch (error) {
      console.error(`Transcription failed for provider ${provider}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const transcriptionService = new TranscriptionService();
