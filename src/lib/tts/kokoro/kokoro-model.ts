// Kokoro TTS Streaming Model
import type { StreamingTTSModel, TTSOptions } from '../types';
import type { KokoroConfig } from './kokoro-config';
import { chunkText } from '../utils/text-chunking';
import { preprocessText } from '../utils/text-preprocessing';
import { debounceAsync } from '../utils/debounce';

const DEFAULT_VOICES = [
  'af_heart',
  'af_alloy',
  'af_aoede',
  'af_bella',
  'af_jessica',
  'af_kore',
  'af_nicole',
  'af_nova',
  'af_river',
  'af_sarah',
  'af_sky',
  'am_adam',
  'am_echo',
  'am_eric',
  'am_fenrir',
  'am_liam',
  'am_michael',
  'am_onyx',
  'am_puck',
  'am_santa',
  'bf_emma',
  'bf_isabella',
  'bm_george',
  'bm_lewis',
  'bf_alice',
  'bf_lily',
  'bm_daniel',
  'bm_fable',
] as const;

export type KokoroVoiceId = (typeof DEFAULT_VOICES)[number];

interface WorkerMessage {
  action: string;
  data?: unknown;
  success?: boolean;
  error?: string;
  requestId?: number;
  blobUrl?: string;
  voices?: string[];
}

/**
 * Kokoro TTS Streaming Model
 * Generates speech using Kokoro WebAssembly model in a Web Worker
 */
export class KokoroTTSModel implements StreamingTTSModel {
  readonly modelId: string;
  readonly provider = 'kokoro';

  private config: KokoroConfig;
  private worker: Worker | null = null;
  private ready = false;
  private availableVoices: string[] = [];
  private pendingRequests = new Map<
    number,
    {
      resolve: (audio: Uint8Array) => void;
      reject: (error: Error) => void;
    }
  >();
  private nextRequestId = 1;
  private initDebounced: ReturnType<typeof debounceAsync<() => Promise<void>>> | null = null;

  constructor(modelId: string = 'kokoro-tts', config: KokoroConfig = {}) {
    this.modelId = modelId;
    this.config = {
      modelId: config.modelId || 'onnx-community/Kokoro-82M-v1.0-ONNX',
      dtype: config.dtype || 'q8',
      device: config.device || 'wasm',
      defaultVoice: config.defaultVoice || 'af_heart',
    };

    // Initialize with default voices
    this.availableVoices = [...DEFAULT_VOICES];

    // Create debounced initialization function (500ms delay)
    const recreateWorkerFn = () => this.recreateWorker();
    this.initDebounced = debounceAsync(recreateWorkerFn, 500);
  }

  /**
   * Generate speech in streaming chunks
   */
  public async *generateStream(options: TTSOptions): AsyncGenerator<Uint8Array> {
    if (!this.ready) {
      await this.initialize();
    }

    if (!this.worker || !this.ready) {
      throw new Error('Kokoro TTS not ready');
    }

    // Preprocess text
    const processedText = preprocessText(options.text);
    if (!processedText.trim()) {
      throw new Error('Empty text after preprocessing');
    }

    // Validate and get voice
    const voice = this.validateVoice(
      (options.voice as KokoroVoiceId) || this.config.defaultVoice || 'af_heart'
    );
    const speed = options.speed || 1.0;

    // Split text into chunks for streaming using improved regex-based chunking
    const chunks = chunkText(processedText, 400);

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      const audio = await this.generateChunk(chunk, voice, speed);
      yield audio;
    }
  }

  /**
   * Generate complete audio (fallback)
   */
  public async generateComplete(options: TTSOptions): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of this.generateStream(options)) {
      chunks.push(chunk);
    }

    // Concatenate all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Initialize Kokoro TTS worker
   */
  private async initialize(): Promise<void> {
    if (this.worker && this.ready) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Create worker for Kokoro TTS
        this.worker = new Worker(
          new URL('./kokoro-worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          const { action, success, error, requestId, blobUrl, voices } = event.data;

          switch (action) {
            case 'initialized':
              if (success) {
                this.ready = true;
                // Extract voices from worker if provided
                if (voices && Array.isArray(voices) && voices.length > 0) {
                  this.availableVoices = voices;
                }
                resolve();
              } else {
                this.ready = false;
                reject(new Error(error || 'Initialization failed'));
              }
              break;

            case 'generatedTts': {
              const request = this.pendingRequests.get(requestId!);
              if (request) {
                if (success && blobUrl) {
                  // Fetch blob and convert to Uint8Array
                  fetch(blobUrl)
                    .then((response) => response.blob())
                    .then((blob) => blob.arrayBuffer())
                    .then((buffer) => {
                      request.resolve(new Uint8Array(buffer));
                      URL.revokeObjectURL(blobUrl);
                    })
                    .catch((err) => {
                      request.reject(new Error(`Failed to fetch audio: ${err}`));
                      URL.revokeObjectURL(blobUrl);
                    });
                } else {
                  request.reject(new Error(error || 'TTS generation failed'));
                }
                this.pendingRequests.delete(requestId!);
              }
              break;
            }
          }
        };

        this.worker.onerror = (error) => {
          this.ready = false;
          reject(new Error(`Worker error: ${error.message}`));
        };

        // Initialize the worker
        this.worker.postMessage({
          action: 'initialize',
          data: {
            modelId: this.config.modelId,
            dtype: this.config.dtype,
            device: this.config.device,
          },
        });

        // Timeout after 10 minutes (600 seconds) for slow model downloads
        setTimeout(() => {
          if (!this.ready) {
            this.ready = false;
            reject(new Error('Kokoro initialization timeout (10 minutes)'));
          }
        }, 600000);
      } catch (error) {
        this.ready = false;
        reject(new Error(`Failed to create worker: ${error}`));
      }
    });
  }

  /**
   * Recreate worker (terminate old, create new)
   * Used when configuration changes
   */
  private async recreateWorker(): Promise<void> {
    // Terminate old worker
    if (this.worker) {
      // Cancel pending requests
      this.pendingRequests.forEach((request) => {
        request.reject(new Error('Worker recreated'));
      });
      this.pendingRequests.clear();

      this.worker.terminate();
      this.worker = null;
    }

    this.ready = false;

    // Create new worker
    await this.initialize();
  }

  /**
   * Update configuration (triggers debounced reinitialization)
   */
  updateConfig(config: Partial<KokoroConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Only reinitialize if relevant config changed
    const needsReinit =
      oldConfig.modelId !== this.config.modelId ||
      oldConfig.dtype !== this.config.dtype ||
      oldConfig.device !== this.config.device;

    if (needsReinit && this.initDebounced) {
      this.initDebounced();
    }
  }

  /**
   * Validate voice ID and fallback to default if invalid
   */
  private validateVoice(voiceId: string): KokoroVoiceId {
    const defaultVoice = (this.config.defaultVoice || 'af_heart') as KokoroVoiceId;

    if (this.availableVoices.includes(voiceId)) {
      return voiceId as KokoroVoiceId;
    }

    console.warn(
      `Voice "${voiceId}" not found in available voices, using default "${defaultVoice}"`
    );
    return defaultVoice;
  }

  /**
   * Generate a single chunk of audio
   */
  private generateChunk(
    text: string,
    voice: KokoroVoiceId,
    speed: number
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      this.pendingRequests.set(requestId, { resolve, reject });

      this.worker!.postMessage({
        action: 'generateTts',
        data: {
          text,
          voice,
          speakingRate: speed,
          requestId,
        },
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('TTS generation timeout'));
        }
      }, 30000);
    });
  }


  /**
   * Dispose resources
   */
  dispose(): void {
    // Cancel pending requests
    this.pendingRequests.forEach((request) => {
      request.reject(new Error('TTS disposed'));
    });
    this.pendingRequests.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
  }
}

