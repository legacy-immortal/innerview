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
import { getConfig } from '../config/index.js';
import { NVIDIA_BASE_URL } from '../config/env.js';
import { createLogger } from '../logger.js';
import { TtlCache, hashText } from '../utils/cache.js';
import {
  checkSystemResources,
  logResourceCheck,
} from '../utils/resource-check.js';

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
  /** Which engine produced the transcript. */
  engine?: 'nvidia-nim' | 'local-whisper';
}

// Detailed download/loading progress for the Whisper model. Surfaced via
// GET /api/transcription/status (polling) and the preload SSE stream so the
// UI can show per-file progress, %, and download speed.
export interface TranscriptionDownloadProgress {
  phase: 'idle' | 'initiate' | 'downloading' | 'loading' | 'ready' | 'error';
  /** File currently being downloaded (basename), null when idle/ready. */
  file: string | null;
  /** Bytes received for the current file. */
  loaded: number;
  /** Total bytes for the current file (0 when unknown). */
  total: number;
  /** Percent for the current file, 0-100. */
  percent: number;
  /** Instantaneous download speed in bytes/sec (0 when unknown). */
  bytesPerSecond: number;
  /** Number of files that have finished downloading. */
  filesCompleted: number;
  /** Human-readable status line for the UI. */
  message: string;
}

// Service status interface
export interface TranscriptionServiceStatus {
  modelId: string;
  ready: boolean;
  loading: boolean;
  failed: boolean;
  error: string | null;
  cacheDir: string;
  /** Detailed download progress (additive; existing fields unchanged). */
  progress: TranscriptionDownloadProgress;
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
// Callable shape of a loaded ASR pipeline (the pipeline() return type
// is a union of task-specific pipelines, none callable in common).
type AsrPipeline = (
  input: Float32Array,
  options?: Record<string, unknown>
) => Promise<{
  text?: string;
  chunks?: Array<{ text: string; timestamp: [number, number] }>;
  language?: string;
}>;

class TranscriptionService {
  private model: AsrPipeline | null = null;
  // Cache transcription results by audio content hash: re-transcribing
  // the same clip (retries, duplicate uploads) re-ran Whisper each time.
  private readonly resultCache = new TtlCache<string, TranscriptionResult>({
    ttlMs: 10 * 60_000,
    maxEntries: 10,
  });
  private modelLoadingPromise: Promise<void> | null = null;
  private modelLoadFailed = false;
  private modelLoadError: string | null = null;
  private initialized = false;
  private progressState: TranscriptionDownloadProgress = {
    phase: 'idle',
    file: null,
    loaded: 0,
    total: 0,
    percent: 0,
    bytesPerSecond: 0,
    filesCompleted: 0,
    message: 'Idle',
  };
  // Last sample for instantaneous speed (bytes/sec) computation.
  private lastSpeedSample: { file: string | null; loaded: number; at: number } =
    { file: null, loaded: 0, at: 0 };

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
        this.progressState = {
          phase: 'loading',
          file: null,
          loaded: 0,
          total: 0,
          percent: 0,
          bytesPerSecond: 0,
          filesCompleted: 0,
          message: `Loading model: ${this.modelId}`,
        };
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
          logger.warn(
            'Resource warnings: %s',
            resourceCheck.warnings.join('; ')
          );
        }

        this.model = (await pipeline(
          'automatic-speech-recognition',
          this.modelId,
          {
            device: 'cpu',
            cache_dir: this.cacheDir,
            progress_callback: (progress: DownloadProgress) => {
              const file =
                progress.file ??
                (progress.model
                  ? (progress.model.split('/').pop() ?? null)
                  : null);
              if (progress.status === 'initiate') {
                this.lastSpeedSample = { file, loaded: 0, at: Date.now() };
                this.progressState = {
                  phase: 'initiate',
                  file,
                  loaded: 0,
                  total: progress.total ?? 0,
                  percent: 0,
                  bytesPerSecond: 0,
                  filesCompleted: this.progressState.filesCompleted,
                  message: `Starting download: ${file || 'model'}`,
                };
                logger.info('Starting download: %s', file || 'model');
              } else if (
                progress.status === 'downloading' ||
                progress.status === 'progress'
              ) {
                // transformers.js reports fractional progress (0-1) and/or
                // loaded/total bytes; normalise both into one shape.
                const loaded = progress.loaded ?? 0;
                const total = progress.total ?? 0;
                let percent = 0;
                if (typeof progress.progress === 'number') {
                  percent = Math.round(progress.progress * 100);
                } else if (loaded && total) {
                  percent = Math.round((loaded / total) * 100);
                }
                const now = Date.now();
                const prev = this.lastSpeedSample;
                const dt = (now - prev.at) / 1000;
                const bytesPerSecond =
                  prev.file === file && dt > 0 && loaded >= prev.loaded
                    ? Math.round((loaded - prev.loaded) / dt)
                    : this.progressState.bytesPerSecond;
                this.lastSpeedSample = { file, loaded, at: now };
                this.progressState = {
                  phase: 'downloading',
                  file,
                  loaded,
                  total,
                  percent,
                  bytesPerSecond,
                  filesCompleted: this.progressState.filesCompleted,
                  message: `Downloading ${file || 'model'}: ${percent}%`,
                };
                if (file) {
                  logger.debug('Downloading %s: %d%%', file, percent);
                }
              } else if (progress.status === 'done') {
                this.progressState = {
                  phase: 'loading',
                  file,
                  loaded: progress.loaded ?? this.progressState.loaded,
                  total: progress.total ?? this.progressState.total,
                  percent: 100,
                  bytesPerSecond: 0,
                  filesCompleted: this.progressState.filesCompleted + 1,
                  message: `Downloaded ${file || 'model'}`,
                };
                logger.info('Downloaded file: %s', file || 'model');
              } else if (progress.status === 'ready') {
                // Pipeline 'ready' sends model id, not file; file download 'done' sends file
                this.progressState = {
                  phase: 'ready',
                  file: null,
                  loaded: 0,
                  total: 0,
                  percent: 100,
                  bytesPerSecond: 0,
                  filesCompleted: this.progressState.filesCompleted,
                  message: 'Model ready',
                };
                logger.info(
                  'Model file ready: %s',
                  progress.file || progress.model || this.modelId
                );
              }
            },
          }
        )) as unknown as AsrPipeline;

        this.initialized = true;
        this.modelLoadingPromise = null;
        this.progressState = {
          phase: 'ready',
          file: null,
          loaded: 0,
          total: 0,
          percent: 100,
          bytesPerSecond: 0,
          filesCompleted: this.progressState.filesCompleted,
          message: 'Model ready',
        };
        logger.info('Model loaded successfully');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to load model: %s', errorMsg);
        this.modelLoadFailed = true;
        this.modelLoadError = errorMsg;
        this.modelLoadingPromise = null;
        this.progressState = {
          ...this.progressState,
          phase: 'error',
          bytesPerSecond: 0,
          message: `Failed to load model: ${errorMsg}`,
        };
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
   * Resolve server-side NVIDIA NIM transcription credentials.
   * Prefers explicit NVIDIA keys; falls back to the merged OpenAI-compatible
   * config when it points at the NVIDIA endpoint (applyNvidiaFallbacks).
   * @returns NIM baseURL/apiKey/model, or null when NIM is not configured.
   */
  private resolveNimConfig(): {
    baseURL: string;
    apiKey: string;
    model: string;
  } | null {
    try {
      const ai = getConfig().ai;
      const explicitKey =
        ai.nvidiaNimApiKey?.trim() || ai.nvidiaApiKey?.trim() || '';
      const openaiBase = ai.openaiBaseURL?.trim().replace(/\/+$/, '') ?? '';
      const isNimEndpoint =
        openaiBase.toLowerCase() === NVIDIA_BASE_URL.toLowerCase();
      const apiKey =
        explicitKey || (isNimEndpoint ? ai.openaiApiKey?.trim() || '' : '');
      if (!apiKey) return null;
      return {
        baseURL: NVIDIA_BASE_URL,
        apiKey,
        model: ai.nimTranscriptionModel,
      };
    } catch {
      return null;
    }
  }

  /**
   * Transcribe via NVIDIA NIM (OpenAI-compatible audio endpoint).
   * Throws on any failure so callers can fall back to local Whisper.
   * @param audioBytes - Raw audio bytes (WAV/MP3/FLAC).
   * @param filename - Filename sent with the multipart upload.
   * @param language - Language hint (default 'en').
   * @returns NIM transcript with word/segment timing when provided.
   */
  private async transcribeViaNim(
    audioBytes: Uint8Array,
    filename: string,
    language = 'en'
  ): Promise<TranscriptionResult> {
    const nim = this.resolveNimConfig();
    if (!nim) throw new Error('NVIDIA NIM transcription is not configured');
    const form = new FormData();
    const audioBlob = new Blob([audioBytes as unknown as ArrayBuffer], {
      type: 'audio/wav',
    });
    form.append('file', audioBlob, filename || 'audio.wav');
    form.append('model', nim.model);
    form.append('language', language);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(`${nim.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${nim.apiKey}` },
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        throw new Error(
          `NIM transcription failed (${response.status}): ${detail.slice(0, 200)}`
        );
      }
      const data = (await response.json()) as {
        text?: string;
        language?: string;
        duration?: number;
        segments?: Array<{
          text?: string;
          start?: number;
          end?: number;
        }>;
      };
      const segments = Array.isArray(data.segments)
        ? data.segments.map((s) => ({
            text: s.text ?? '',
            startSecond: s.start ?? 0,
            endSecond: s.end ?? 0,
          }))
        : [];
      logger.info(
        'NIM transcription completed, model=%s segments=%s',
        nim.model,
        segments.length
      );
      return {
        text: data.text ?? '',
        segments,
        language: data.language || language,
        duration: data.duration,
        engine: 'nvidia-nim',
      };
    } finally {
      clearTimeout(timeout);
    }
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
    // Convert ArrayBuffer to Uint8Array if needed
    const uint8Data =
      audioData instanceof ArrayBuffer ? new Uint8Array(audioData) : audioData;

    // Serve identical audio from cache instead of re-running transcription.
    const cacheKey = hashText(uint8Data);
    const cachedResult = this.resultCache.get(cacheKey);
    if (cachedResult) {
      logger.info('Transcription cache hit');
      return {
        ...cachedResult,
        segments: cachedResult.segments.map((s) => ({ ...s })),
      };
    }

    // Cloud-first: use server-side NVIDIA NIM when configured (covers
    // low-compute devices that cannot run transcription locally).
    // Falls back to local Whisper on any NIM failure.
    if (this.resolveNimConfig()) {
      try {
        const nimResult = await this.transcribeViaNim(
          uint8Data,
          'audio.wav',
          options.language || 'en'
        );
        this.resultCache.set(cacheKey, nimResult);
        return nimResult;
      } catch (error) {
        logger.warn(
          'NIM transcription failed, falling back to local Whisper: %s',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    await this.ensureInitialized();

    if (!this.model) {
      throw new Error('Transcription model not initialized');
    }

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
    const result = await this.model(preparedAudio, {
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

    const finalResult: TranscriptionResult = {
      text,
      segments,
      language: result?.language || options.language || 'en',
      duration,
      engine: 'local-whisper',
    };
    this.resultCache.set(cacheKey, finalResult);
    return finalResult;
  }

  /**
   * Transcribe audio from a File object.
   * Cloud-first: tries server-side NVIDIA NIM when configured, falls back
   * to the local Whisper model (see {@link transcribe}).
   * @param audioFile - Audio file to transcribe.
   * @param options - Transcription options.
   * @returns Transcription result including the engine used.
   */
  async transcribeFile(
    audioFile: File,
    options: { language?: string } = {}
  ): Promise<TranscriptionResult> {
    // Prefer NIM for file uploads too (avoids decoding locally first).
    if (this.resolveNimConfig()) {
      try {
        const bytes = new Uint8Array(await audioFile.arrayBuffer());
        const nimResult = await this.transcribeViaNim(
          bytes,
          audioFile.name || 'audio.wav',
          options.language || 'en'
        );
        this.resultCache.set(hashText(bytes), nimResult);
        return nimResult;
      } catch (error) {
        logger.warn(
          'NIM transcription failed, falling back to local Whisper: %s',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
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
   * Get a snapshot of the detailed download/loading progress.
   */
  getProgress(): TranscriptionDownloadProgress {
    return { ...this.progressState };
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
      progress: this.getProgress(),
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
