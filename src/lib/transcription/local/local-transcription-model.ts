/**
 * @file local-transcription-model.ts — Local transcription model (browser/backend).
 * @module lib/transcription/local/local-transcription-model
 *
 * Local Transcription Model supporting both browser and backend transcription.
 * Browser mode uses transformersJS.transcription() from @built-in-ai/transformers-js
 * (loaded lazily via dynamic import); backend mode calls faster-whisper via
 * the API endpoint. The browser model loads only through a dedicated opt-in
 * phase and never auto-downloads post-bootstrap.
 */
import type {
  SharedV2Headers,
  SharedV2ProviderMetadata,
  TranscriptionModelV2,
  TranscriptionModelV2CallOptions,
  TranscriptionModelV2CallWarning,
  TranscriptionModelV3,
} from '@ai-sdk/provider';
import { experimental_transcribe as transcribe } from 'ai';
import type { LocalTranscriptionConfig } from './local-transcription-config';

/**
 * Progress info for the dedicated browser-model loading phase.
 */
export interface BrowserModelLoadProgress {
  /** 0-100 */
  progress: number;
  file?: string | null;
  loaded?: number;
  total?: number;
}

/**
 * Shape of the lazily loaded `@built-in-ai/transformers-js` module. Loaded
 * via dynamic `import()` so the (large) Transformers.js runtime is
 * code-split and never enters the main bundle / downloads on module load.
 */
interface TransformersJSModule {
  transformersJS: {
    transcription: (
      modelId: string,
      options?: {
        device?: 'auto' | 'cpu' | 'webgpu';
        language?: string;
        returnTimestamps?: boolean;
        initProgressCallback?: (progress: BrowserModelLoadProgress) => void;
      }
    ) => TranscriptionModelV3 | Promise<TranscriptionModelV3>;
  };
}

/**
 * Local Transcription Model supporting both browser and backend transcription
 * Browser mode: Uses transformersJS.transcription() from @built-in-ai/transformers-js
 * Backend mode: Uses faster-whisper via API endpoint
 */
export class LocalTranscriptionModel implements TranscriptionModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly modelId: string;
  readonly provider = 'local-transcription';
  private readonly config: LocalTranscriptionConfig;
  private allowBrowserModelLoad: boolean;
  private browserModel: TranscriptionModelV3 | null = null;
  private browserModelLoading: Promise<TranscriptionModelV3> | null = null;

  constructor(modelId: string, config: LocalTranscriptionConfig) {
    this.modelId = modelId;
    this.config = config;
    this.allowBrowserModelLoad = config.allowBrowserModelLoad === true;
  }

  /**
   * Flip the opt-in flag at runtime (e.g. when the user opts in via
   * settings / the hook's `allowBrowserModelLoad`). The dedicated loading
   * phase must still be run via {@link ensureBrowserModelLoaded} before
   * transcribing — this only unlocks the gate.
   * @param allowed - Whether browser-model download is now allowed.
   */
  public setAllowBrowserModelLoad(allowed: boolean): void {
    this.allowBrowserModelLoad = allowed;
  }

  /**
   * Whether the browser Whisper model has been loaded already.
   */
  public isBrowserModelLoaded(): boolean {
    return this.browserModel != null;
  }

  /**
   * Whether an opt-in browser-model load is currently in flight.
   */
  public isBrowserModelLoading(): boolean {
    return this.browserModelLoading != null;
  }

  /**
   * Opt-in gate for the browser (Transformers.js) model.
   * @returns True only when loading was explicitly allowed.
   */
  private isBrowserModelLoadAllowed(): boolean {
    return this.allowBrowserModelLoad === true;
  }

  /**
   * Dedicated loading phase for the browser Whisper model.
   *
   * This is the ONLY path that may download the browser model. Callers must
   * opt in first via `allowBrowserModelLoad: true` (e.g. from the settings
   * UI after the user explicitly chose browser mode) and should surface
   * `isBrowserModelLoading()` / `onProgress` in a dedicated loading UI
   * instead of firing a transcribe and downloading silently inside it.
   *
   * @param onProgress - Optional per-file download progress callback.
   * @returns Resolves with the loaded browser model, or the cached one.
   * @throws When browser-model loading was not opted into.
   */
  public async ensureBrowserModelLoaded(
    onProgress?: (progress: BrowserModelLoadProgress) => void
  ): Promise<TranscriptionModelV3> {
    if (this.browserModel) {
      return this.browserModel;
    }
    if (this.browserModelLoading) {
      return this.browserModelLoading;
    }
    if (!this.isBrowserModelLoadAllowed()) {
      throw new Error(
        'Browser Whisper model is opt-in only and was not enabled. ' +
          'Enable browser transcription in settings (opt-in), then load the ' +
          'model via the dedicated loading phase before transcribing. ' +
          'The backend Whisper model (loaded during bootstrap) is used by default.'
      );
    }

    this.browserModelLoading = this.loadBrowserModel(onProgress)
      .then((model) => {
        this.browserModel = model;
        return model;
      })
      .finally(() => {
        this.browserModelLoading = null;
      });

    return this.browserModelLoading;
  }

  private async loadBrowserModel(
    onProgress?: (progress: BrowserModelLoadProgress) => void
  ): Promise<TranscriptionModelV3> {
    const { transformersJS } =
      (await import('@built-in-ai/transformers-js')) as unknown as TransformersJSModule;
    return transformersJS.transcription(this.config.modelId, {
      device: 'auto',
      language: this.config.language,
      returnTimestamps: true,
      initProgressCallback: onProgress,
    });
  }

  public async doGenerate(options: TranscriptionModelV2CallOptions): Promise<{
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
    // The browser model is only ever loaded through the dedicated opt-in
    // loading phase (ensureBrowserModelLoaded, with its own loading UI),
    // never silently here. doGenerate must never download: it requires a
    // model that was already loaded via ensureBrowserModelLoaded() and
    // throws the opt-in error otherwise. This guarantees zero model loads
    // post-bootstrap from any transcribe path (e.g. Settings test panels
    // calling transcriptionService.transcribe directly).
    const browserModel = this.browserModel;
    if (browserModel == null) {
      throw new Error(
        'Browser Whisper model is not loaded. Load it via the dedicated ' +
          'opt-in loading phase (ensureBrowserModelLoaded) with ' +
          'allowBrowserModelLoad: true before transcribing. The backend ' +
          'Whisper model (loaded during bootstrap) is used by default.'
      );
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
      model: browserModel,
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

  public dispose(): void {
    // Clean up browser model if initialized
    this.browserModel = null;
    this.browserModelLoading = null;
  }
}
