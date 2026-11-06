// Local Transcription Model - Supports both browser and backend transcription
// Browser-based transcription uses @built-in-ai/transformers-js via transformersJS.transcription()
// Backend transcription uses faster-whisper via API endpoint
import type {
  SharedV2Headers,
  SharedV2ProviderMetadata,
  TranscriptionModelV2,
  TranscriptionModelV2CallOptions,
  TranscriptionModelV2CallWarning,
} from '@ai-sdk/provider';
import { transformersJS } from '@built-in-ai/transformers-js';
import { experimental_transcribe as transcribe } from 'ai';
import type { LocalTranscriptionConfig } from './local-transcription-config';

/**
 * Local Transcription Model supporting both browser and backend transcription
 * Browser mode: Uses transformersJS.transcription() from @built-in-ai/transformers-js
 * Backend mode: Uses faster-whisper via API endpoint
 */
export class LocalTranscriptionModel implements TranscriptionModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly modelId: string;
  readonly provider = 'local-transcription';
  private config: LocalTranscriptionConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private browserModel: any = null;

  constructor(modelId: string, config: LocalTranscriptionConfig) {
    this.modelId = modelId;
    this.config = config;
  }

  async doGenerate(options: TranscriptionModelV2CallOptions): Promise<{
    text: string;
    segments: Array<{
      text: string;
      startSecond: number;
      endSecond: number;
    }>;
    language: string | undefined;
    durationInSeconds: number | undefined;
    warnings: Array<TranscriptionModelV2CallWarning>;
    request?: {
      body?: string;
    };
    response: {
      timestamp: Date;
      modelId: string;
      headers?: SharedV2Headers;
      body?: unknown;
    };
    providerMetadata?: SharedV2ProviderMetadata;
  }> {
    if (this.config.mode === 'browser') {
      return this.transcribeBrowser(options);
    } else {
      return this.transcribeBackend(options);
    }
  }

  private async transcribeBrowser(
    options: TranscriptionModelV2CallOptions
  ): Promise<{
    text: string;
    segments: Array<{
      text: string;
      startSecond: number;
      endSecond: number;
    }>;
    language: string | undefined;
    durationInSeconds: number | undefined;
    warnings: Array<TranscriptionModelV2CallWarning>;
    request?: {
      body?: string;
    };
    response: {
      timestamp: Date;
      modelId: string;
      headers?: SharedV2Headers;
      body?: unknown;
    };
    providerMetadata?: SharedV2ProviderMetadata;
  }> {
    // Initialize model if not already initialized
    if (!this.browserModel) {
      const model = transformersJS.transcription(this.config.modelId, {
        device: 'auto',
        language: this.config.language,
        returnTimestamps: true,
      });
      this.browserModel = await model;
    }

    // Convert audio to format suitable for transcription
    let audioData: Uint8Array;

    if (typeof options.audio === 'string') {
      // Base64 encoded audio
      const binaryString = atob(options.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioData = bytes;
    } else if (options.audio instanceof Uint8Array) {
      audioData = options.audio;
    } else if (
      options.audio &&
      typeof options.audio === 'object' &&
      'byteLength' in options.audio
    ) {
      // ArrayBuffer
      audioData = new Uint8Array(options.audio as ArrayBuffer);
    } else {
      // Blob - convert to ArrayBuffer
      const arrayBuffer = await (options.audio as Blob).arrayBuffer();
      audioData = new Uint8Array(arrayBuffer);
    }

    // Use Vercel AI SDK's transcribe function with transformersJS model
    const result = await transcribe({
      model: this.browserModel,
      audio: audioData,
    });

    // Convert segments to expected format
    const segments =
      result.segments?.map((seg) => ({
        text: seg.text,
        startSecond: seg.startSecond ?? 0,
        endSecond: seg.endSecond ?? 0,
      })) || [];

    return {
      text: result.text,
      segments,
      language: result.language,
      durationInSeconds: result.durationInSeconds,
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: {},
        body: result,
      },
      providerMetadata: {
        local: {
          mode: 'browser',
          modelId: this.config.modelId,
        },
      },
    };
  }

  private async transcribeBackend(
    options: TranscriptionModelV2CallOptions
  ): Promise<{
    text: string;
    segments: Array<{
      text: string;
      startSecond: number;
      endSecond: number;
    }>;
    language: string | undefined;
    durationInSeconds: number | undefined;
    warnings: Array<TranscriptionModelV2CallWarning>;
    request?: {
      body?: string;
    };
    response: {
      timestamp: Date;
      modelId: string;
      headers?: SharedV2Headers;
      body?: unknown;
    };
    providerMetadata?: SharedV2ProviderMetadata;
  }> {
    // Convert audio to format suitable for backend
    const audioData = options.audio;
    const mediaType = options.mediaType || 'audio/webm';
    let audioBlob: Blob;

    if (typeof audioData === 'string') {
      // Base64 encoded audio
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioBlob = new Blob([bytes], { type: mediaType });
    } else if (audioData instanceof Uint8Array) {
      // Use the buffer with type assertion to avoid type issues
      audioBlob = new Blob([audioData.buffer as ArrayBuffer], {
        type: mediaType,
      });
    } else {
      throw new Error('Unsupported audio format for backend transcription');
    }

    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    if (this.config.language) {
      formData.append('language', this.config.language);
    }

    if (this.config.task) {
      formData.append('task', this.config.task);
    }

    // Call backend transcription API
    const response = await fetch(this.config.backendUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Backend transcription failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      text: result.text || '',
      segments: result.segments || [],
      language: result.language,
      durationInSeconds: result.duration,
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: {},
        body: result,
      },
      providerMetadata: {
        local: {
          mode: 'backend',
          modelId: this.config.modelId,
        },
      },
    };
  }

  dispose(): void {
    // Clean up browser model if initialized
    this.browserModel = null;
  }
}
