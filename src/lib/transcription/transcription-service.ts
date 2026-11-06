// Transcription Service using Vercel AI SDK with multiple providers
import { openai } from '@ai-sdk/openai';
import { experimental_transcribe as transcribe } from 'ai';
import { useSettingsStore } from '../settings-store';
import { localTranscription } from './local';

export interface TranscriptionOptions {
  language?: string;
  provider?: 'openai' | 'local';
  modelId?: string;
  timestampGranularities?: ('word' | 'segment')[];
  task?: 'transcribe' | 'translate';
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    startSecond: number;
    endSecond: number;
  }>;
  duration?: number;
}

export class TranscriptionService {
  async transcribe(
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

        const result = await transcribe({
          model: openai.transcription(modelId),
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
        // Get mode from settings (user preference) or fall back to environment detection
        const localSettings = settings?.local;
        const mode =
          localSettings?.mode ||
          (typeof window !== 'undefined' ? 'browser' : 'backend');
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
