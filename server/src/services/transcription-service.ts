// Transcription service using @huggingface/transformers Whisper model
//
// This implementation uses:
// - HuggingFace Transformers.js for local speech recognition (no API calls required)
// - onnx-community/whisper-tiny.en model for fast English transcription
// - Automatic model download if not found locally
// - Progress tracking during model download
// - Graceful error handling and retry logic

import { pipeline, env as transformersEnv } from '@huggingface/transformers';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import wavefile from 'wavefile';
import { createLogger } from '../logger.js';
import { checkSystemResources, logResourceCheck } from '../utils/resource-check.js';

const logger = createLogger('TranscriptionService');

// Transcription result interface
export interface TranscriptionResult {
  text: string;
  segments: Array<{
    text: string;
    startSecond: number;
    endSecond: number;
  }>;
  language?: string;
  duration?: number;
}

// Service status interface
export interface TranscriptionServiceStatus {
  modelId: string;
  ready: boolean;
  loading: boolean;
  failed: boolean;
  error: string | null;
  cacheDir: string;
}

// Progress callback type for model download
// Pipeline 'ready' event has { status, task, model } (no file); file download events have file
interface DownloadProgress {
  status: string;
  progress?: number;
  file?: string;
  model?: string;
  loaded?: number;
  total?: number;
}

/**
 * Transcription service class for speech-to-text conversion
 * Uses Whisper model via HuggingFace Transformers.js
 */
class TranscriptionService {
  private model: Awaited<ReturnType<typeof pipeline>> | null = null;
  private modelLoadingPromise: Promise<void> | null = null;
  private modelLoadFailed = false;
  private modelLoadError: string | null = null;
  private initialized = false;

  // Model configuration
  private readonly modelId = 'onnx-community/whisper-tiny.en';
  private readonly cacheDir = join(
    process.cwd(),
    'server',
    'models',
    'whisper-cache'
  );

  constructor() {
    // Configure transformers.js environment
    transformersEnv.cacheDir = this.cacheDir;
    transformersEnv.allowLocalModels = true;
    transformersEnv.allowRemoteModels = true;
  }

  /**
   * Check if the model is already downloaded locally
   */
  private isModelDownloaded(): boolean {
    const modelPath = join(
      this.cacheDir,
      'onnx-community',
      'whisper-tiny.en',
      'config.json'
    );
    return existsSync(modelPath);
  }

  /**
   * Ensure the cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
      logger.info('Created cache directory: %s', this.cacheDir);
    }
  }

  /**
   * Initialize the transcription model
   * Downloads the model if not already cached
   */
  private async initializeModel(): Promise<void> {
    if (this.model) {
      return;
    }

    // If model loading already failed, don't retry immediately
    if (this.modelLoadFailed) {
      throw new Error(
        this.modelLoadError ||
          'Model loading previously failed. Call resetError() to retry.'
      );
    }

    // If already loading, wait for it
    if (this.modelLoadingPromise) {
      return this.modelLoadingPromise;
    }

    this.modelLoadingPromise = (async () => {
      try {
        await this.ensureCacheDir();

        const modelDownloaded = this.isModelDownloaded();
        logger.info('Loading model: %s', this.modelId);
        logger.info('Cache directory: %s', this.cacheDir);
        logger.info('Model already downloaded: %s', modelDownloaded);

        // Resource check before attempting to load/download model
        const resourceCheck = await checkSystemResources(
          { minFreeMemoryMB: 1024, minDiskSpaceMB: 2048, minCpuCores: 2 },
          this.cacheDir
        );
        logResourceCheck(resourceCheck);
        if (!resourceCheck.ok) {
          const errorMsg = `Insufficient resources to load model: ${resourceCheck.errors.join('; ')}`;
          logger.error(errorMsg);
          throw new Error(errorMsg);
        }
        if (resourceCheck.warnings.length > 0) {
          logger.warn('Resource warnings: %s', resourceCheck.warnings.join('; '));
        }

        this.model = await pipeline(
          'automatic-speech-recognition',
          this.modelId,
          {
            device: 'cpu',
            cache_dir: this.cacheDir,
            progress_callback: (progress: DownloadProgress) => {
              if (progress.status === 'downloading') {
                let percent = 0;
                if (typeof progress.progress === 'number') {
                  percent = Math.round(progress.progress * 100);
                } else if (progress.loaded && progress.total) {
                  percent = Math.round(
                    (progress.loaded / progress.total) * 100
                  );
                }
                if (progress.file) {
                  logger.debug('Downloading %s: %d%%', progress.file, percent);
                }
              } else if (progress.status === 'ready') {
                // Pipeline 'ready' sends model id, not file; file download 'done' sends file
                logger.info(
                  'Model file ready: %s',
                  progress.file || progress.model || this.modelId
                );
              } else if (progress.status === 'initiate') {
                logger.info('Starting download: %s', progress.file || 'model');
              }
            },
          }
        );

        this.initialized = true;
        logger.info('Model loaded successfully');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to load model: %s', errorMsg);
        this.modelLoadFailed = true;
        this.modelLoadError = errorMsg;
        this.modelLoadingPromise = null;
        throw error;
      }
    })();

    return this.modelLoadingPromise;
  }

  /**
   * Ensure the service is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.model) {
      await this.initializeModel();
    }
  }

  /**
   * Decode WAV audio data to Float32Array at 16kHz for Whisper.
   * Uses wavefile to parse WAV headers, convert bit depth, and resample.
   */
  private decodeWavAudio(audioData: Uint8Array): Float32Array {
    const wav = new wavefile.WaveFile(audioData);
    wav.toBitDepth('32f');
    wav.toSampleRate(16000);

    let samples = wav.getSamples();
    if (Array.isArray(samples)) {
      if (samples.length > 1) {
        // Downmix stereo to mono (same scaling as ffmpeg -ac 1)
        const SCALING_FACTOR = Math.sqrt(2);
        const left = samples[0];
        const right = samples[1];
        for (let i = 0; i < left.length; i++) {
          left[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
        }
      }
      samples = samples[0];
    }

    // toBitDepth('32f') produces Float32Array, but ensure type safety
    if (samples instanceof Float32Array) return samples;
    return new Float32Array(samples);
  }

  /**
   * Transcribe audio data to text
   * @param audioData - Raw audio data as Uint8Array or ArrayBuffer
   * @param options - Transcription options (language is ignored for English-only model)
   */
  async transcribe(
    audioData: Uint8Array | ArrayBuffer,
    options: { language?: string } = {}
  ): Promise<TranscriptionResult> {
    await this.ensureInitialized();

    if (!this.model) {
      throw new Error('Transcription model not initialized');
    }

    // Convert ArrayBuffer to Uint8Array if needed
    const uint8Data =
      audioData instanceof ArrayBuffer ? new Uint8Array(audioData) : audioData;

    // Decode WAV to Float32Array at 16kHz for Whisper
    const preparedAudio = this.decodeWavAudio(uint8Data);

    // Log if user requested non-English (model only supports English)
    if (options.language && options.language !== 'en') {
      logger.warn(
        'Language %s requested but model only supports English',
        options.language
      );
    }

    logger.info('Starting transcription');

    // Run transcription
    // Note: whisper-tiny.en is English-only, so we don't pass language/task params
    // @ts-expect-error - pipeline return type is complex, result structure is correct
    const result: {
      text?: string;
      chunks?: Array<{ text: string; timestamp: [number, number] }>;
      language?: string;
    } = await this.model(preparedAudio, {
      return_timestamps: true,
    });

    // Extract text and segments from result
    const text = result?.text || '';
    const chunks = result?.chunks || [];

    // Convert segments to expected format
    const segments = chunks.map(
      (chunk: { text: string; timestamp: [number, number] }) => ({
        text: chunk.text,
        startSecond: chunk.timestamp[0] ?? 0,
        endSecond: chunk.timestamp[1] ?? 0,
      })
    );

    // Calculate duration from last segment
    const duration =
      segments.length > 0
        ? segments[segments.length - 1]?.endSecond
        : undefined;

    logger.info('Transcription completed, segments=%s', segments.length);

    return {
      text,
      segments,
      language: result?.language || options.language || 'en',
      duration,
    };
  }

  /**
   * Transcribe audio from a File object
   * @param audioFile - Audio file to transcribe
   * @param options - Transcription options
   */
  async transcribeFile(
    audioFile: File,
    options: { language?: string } = {}
  ): Promise<TranscriptionResult> {
    const arrayBuffer = await audioFile.arrayBuffer();
    return this.transcribe(arrayBuffer, options);
  }

  /**
   * Preload the model without transcribing
   * Useful for warming up the service
   */
  async preload(): Promise<void> {
    await this.ensureInitialized();
  }

  /**
   * Reset error state to allow retry
   */
  resetError(): void {
    this.modelLoadFailed = false;
    this.modelLoadError = null;
    this.modelLoadingPromise = null;
  }

  /**
   * Get current service status
   */
  getStatus(): TranscriptionServiceStatus {
    return {
      modelId: this.modelId,
      ready: this.model !== null,
      loading: this.modelLoadingPromise !== null && !this.modelLoadFailed,
      failed: this.modelLoadFailed,
      error: this.modelLoadError,
      cacheDir: this.cacheDir,
    };
  }

  /**
   * Check if the service is ready to transcribe
   */
  isReady(): boolean {
    return this.model !== null;
  }

  /**
   * Get the model ID being used
   */
  getModelId(): string {
    return this.modelId;
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
