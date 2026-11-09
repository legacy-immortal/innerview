/**
 * @file Preloading of the Kokoro TTS and Whisper transcription models at startup.
 * @module lib/model-preloader.ts
 */
// Model preloader for Kokoro TTS and Whisper transcription
// Preloads models during startup if performance threshold is met

import {
  initializeTranscriptionService,
  type TranscriptionTestProgress,
} from './transcription';
import { KokoroTTSModel } from './tts/kokoro';

export interface ModelDownloadProgress {
  model: 'kokoro' | 'whisper';
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'complete' | 'error';
  error?: string;
  /** Detailed per-file progress (Whisper): file being downloaded/loaded. */
  file?: string | null;
  /** Bytes received for the current file. */
  loaded?: number;
  /** Total bytes for the current file (0 when unknown). */
  total?: number;
  /** Download speed in bytes/sec (0 when unknown). */
  bytesPerSecond?: number;
  /** Coarse phase: download vs. loading/initialising the model. */
  phase?: 'download' | 'loading' | 'ready' | 'error';
  /** Human-readable status line (e.g. "Downloading model.onnx: 42%"). */
  message?: string;
  /** Number of files that have finished downloading. */
  filesCompleted?: number;
}

/** Format bytes as e.g. "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format bytes/sec as e.g. "1.2 MB/s". */
export function formatSpeed(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '';
  return `${formatBytes(bytesPerSecond)}/s`;
}

export type ProgressCallback = (progress: ModelDownloadProgress) => void;

/**
 * Preload Kokoro TTS model
 * @param onProgress - Callback for progress updates
 * @returns Promise that resolves when model is loaded
 */
export async function preloadKokoroModel(
  onProgress?: ProgressCallback
): Promise<void> {
  if (onProgress) {
    onProgress({
      model: 'kokoro',
      progress: 0,
      status: 'pending',
    });
  }

  try {
    if (onProgress) {
      onProgress({
        model: 'kokoro',
        progress: 10,
        status: 'downloading',
      });
    }

    // Create Kokoro TTS model instance
    // This will trigger worker initialization and model download
    const kokoroModel = new KokoroTTSModel(
      'onnx-community/Kokoro-82M-v1.0-ONNX',
      {
        dtype: 'q8',
        device: 'wasm',
      }
    );

    if (onProgress) {
      onProgress({
        model: 'kokoro',
        progress: 30,
        status: 'downloading',
      });
    }

    // Trigger initialization by calling generateStream with a small test text
    // This will initialize the worker and download the model if needed
    try {
      const testGenerator = kokoroModel.generateStream({
        text: 'test',
        voice: 'af_heart',
      });

      // Consume the generator to trigger initialization
      // We'll read just the first chunk to ensure initialization happens
      const firstChunk = await testGenerator.next();
      if (firstChunk.done) {
        throw new Error('Model initialization failed - no chunks generated');
      }

      if (onProgress) {
        onProgress({
          model: 'kokoro',
          progress: 60,
          status: 'downloading',
        });
      }

      // Wait a bit for model to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (onProgress) {
        onProgress({
          model: 'kokoro',
          progress: 90,
          status: 'downloading',
        });
      }

      // Additional wait for worker to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (initError) {
      // If initialization fails, we still report progress
      // The error will be caught by the outer try-catch
      console.warn('Kokoro model preload initialization warning:', initError);
    }

    if (onProgress) {
      onProgress({
        model: 'kokoro',
        progress: 100,
        status: 'complete',
      });
    }
  } catch (error) {
    if (onProgress) {
      onProgress({
        model: 'kokoro',
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    throw error;
  }
}

/**
 * Preload Whisper transcription model and test with sample audio.
 *
 * Bootstrap path: validates the BACKEND Whisper model only (via
 * {@link initializeTranscriptionService} → `POST /api/transcription`).
 * The frontend browser (Transformers.js) Whisper model is NEVER loaded here:
 * it downloads its own copy (`Xenova/whisper-base`) in addition to the
 * backend model, which previously caused a second download during/after
 * bootstrap. Use {@link preloadBrowserWhisperModel} (explicit opt-in only)
 * when browser mode is genuinely required.
 *
 * @param onProgress - Callback for progress updates
 * @param options - Configuration options
 * @returns Promise that resolves when model is loaded and tested
 */
export async function preloadWhisperModel(
  onProgress?: ProgressCallback,
  options: {
    skipTest?: boolean;
    provider?: 'openai' | 'local';
  } = {}
): Promise<void> {
  const { skipTest = false, provider = 'local' } = options;

  console.log('[preloadWhisperModel] Starting...', { skipTest, provider });

  if (onProgress) {
    onProgress({
      model: 'whisper',
      progress: 0,
      status: 'pending',
      phase: 'download',
      message: 'Starting Whisper model download...',
    });
  }

  try {
    // Check backend status first to avoid showing a fake "downloading" phase
    // when the model is already ready/cached in memory.
    let backendReady = false;
    try {
      const statusRes = await fetch('/api/transcription/status');
      if (statusRes.ok) {
        const status = (await statusRes.json()) as { ready?: boolean };
        backendReady = status.ready === true;
      }
    } catch {
      // Status check failed; proceed with full init flow.
    }

    if (backendReady && !skipTest) {
      // Model already loaded: show a brief validation phase, not a download.
      if (onProgress) {
        onProgress({
          model: 'whisper',
          progress: 85,
          status: 'downloading',
          phase: 'loading',
          message: 'Validating transcription model...',
        });
      }
      console.log('[preloadWhisperModel] Backend ready; validating...');
      await initializeTranscriptionService(
        (testProgress: TranscriptionTestProgress) => {
          if (onProgress) {
            onProgress({
              model: 'whisper',
              progress:
                testProgress.stage === 'complete'
                  ? 100
                  : 85 + Math.round(testProgress.progress * 0.15),
              status:
                testProgress.stage === 'error'
                  ? 'error'
                  : testProgress.stage === 'complete'
                    ? 'complete'
                    : 'downloading',
              phase: testProgress.stage === 'error' ? 'error' : 'loading',
              message: testProgress.message || 'Validating...',
              error: testProgress.error,
            });
          }
        },
        { provider, skipTest: false }
      );
    } else if (!skipTest) {
      // Model not ready: show real download/loading progress from the
      // bootstrap init (per-file %, bytes, speed) without fake synthetic
      // "downloading" steps that flash instantly when cached.
      if (onProgress) {
        onProgress({
          model: 'whisper',
          progress: 5,
          status: 'downloading',
          phase: 'download',
          message: 'Preparing transcription model...',
        });
      }
      console.log('[preloadWhisperModel] Starting backend init/test...');
      await initializeTranscriptionService(
        (testProgress: TranscriptionTestProgress) => {
          if (onProgress) {
            const isModelPhase =
              testProgress.stage === 'download' &&
              (testProgress.file != null || testProgress.total != null);
            onProgress({
              model: 'whisper',
              progress: Math.round(testProgress.progress),
              status:
                testProgress.stage === 'error'
                  ? 'error'
                  : testProgress.stage === 'complete'
                    ? 'complete'
                    : 'downloading',
              phase:
                testProgress.stage === 'error'
                  ? 'error'
                  : isModelPhase
                    ? 'download'
                    : 'loading',
              file: testProgress.file ?? null,
              loaded: testProgress.loaded,
              total: testProgress.total,
              bytesPerSecond: testProgress.bytesPerSecond,
              filesCompleted: testProgress.filesCompleted,
              message: testProgress.message,
              error: testProgress.error,
            });
          }
        },
        { provider, skipTest: false }
      );
      console.log('[preloadWhisperModel] Backend init/test completed');
    }

    // Complete
    if (onProgress) {
      onProgress({
        model: 'whisper',
        progress: 100,
        status: 'complete',
        phase: 'loading',
        message: 'Transcription model ready',
      });
    }

    console.log('[preloadWhisperModel] Complete');
  } catch (error) {
    if (onProgress) {
      onProgress({
        model: 'whisper',
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    throw error;
  }
}

/**
 * Dedicated opt-in loading phase for the browser (Transformers.js) Whisper
 * model (`Xenova/whisper-base`).
 *
 * NEVER call this from bootstrap or any automatic path. Call it only after
 * the user has explicitly opted into browser transcription (e.g. from the
 * transcription settings UI), and surface `onProgress` in a dedicated
 * loading UI. Loads via dynamic import so Transformers.js stays code-split.
 *
 * @param onProgress - Callback for detailed download progress updates
 * @returns Promise that resolves when the browser model is loaded
 */
export async function preloadBrowserWhisperModel(
  onProgress?: ProgressCallback
): Promise<void> {
  console.log('[preloadBrowserWhisperModel] Starting (opt-in only)...');

  if (onProgress) {
    onProgress({
      model: 'whisper',
      progress: 0,
      status: 'pending',
      phase: 'download',
      message: 'Starting browser Whisper model download...',
    });
  }

  try {
    const { transformersJS } = await import('@built-in-ai/transformers-js');

    interface BrowserProgressEvent {
      progress: number;
      file?: string;
      loaded?: number;
      total?: number;
      status?: string;
    }

    let browserLast = { file: '' as string | null, loaded: 0, at: 0 };
    const toDetailedProgress = (
      event: BrowserProgressEvent
    ): ModelDownloadProgress => {
      const now = Date.now();
      const file = event.file ?? null;
      const loaded = event.loaded ?? 0;
      const total = event.total ?? 0;
      const dt = (now - browserLast.at) / 1000;
      const bytesPerSecond =
        browserLast.file === file && dt > 0 && loaded >= browserLast.loaded
          ? Math.round((loaded - browserLast.loaded) / dt)
          : 0;
      browserLast = { file, loaded, at: now };
      return {
        model: 'whisper',
        progress: Math.round(event.progress * 100),
        status: 'downloading',
        phase: 'download',
        file,
        loaded,
        total,
        bytesPerSecond,
        message: `Downloading ${file || 'Xenova/whisper-base'}: ${Math.round(event.progress * 100)}%`,
      };
    };

    const transcriptionModel = (
      transformersJS as unknown as {
        transcription: (
          modelId: string,
          options?: {
            device?: 'auto' | 'cpu' | 'webgpu';
            initProgressCallback?: (progress: BrowserProgressEvent) => void;
          }
        ) => Promise<{
          availability: () => Promise<
            'unavailable' | 'downloadable' | 'available'
          >;
          createSessionWithProgress: (
            onProgress?: (progress: BrowserProgressEvent) => void
          ) => Promise<unknown>;
        }>;
      }
    ).transcription('Xenova/whisper-base', {
      device: 'auto',
      initProgressCallback: (progress: BrowserProgressEvent) => {
        if (onProgress) {
          onProgress(toDetailedProgress(progress));
        }
      },
    });

    const model = await transcriptionModel;
    const availability = await model.availability();

    if (availability === 'downloadable') {
      await model.createSessionWithProgress(
        (progress: BrowserProgressEvent) => {
          if (onProgress) {
            onProgress(toDetailedProgress(progress));
          }
        }
      );
    }

    if (onProgress) {
      onProgress({
        model: 'whisper',
        progress: 100,
        status: 'complete',
        phase: 'loading',
        message: 'Browser Whisper model ready',
      });
    }
    console.log(
      '[preloadBrowserWhisperModel] Browser model loaded successfully'
    );
  } catch (error) {
    if (onProgress) {
      onProgress({
        model: 'whisper',
        progress: 0,
        status: 'error',
        phase: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    throw error;
  }
}

/**
 * Preload both models in parallel
 * @param onProgress - Callback for progress updates
 * @returns Promise that resolves when both models are loaded
 */
export async function preloadAllModels(
  onProgress?: ProgressCallback
): Promise<void> {
  const kokoroProgress: ModelDownloadProgress = {
    model: 'kokoro',
    progress: 0,
    status: 'pending',
  };
  const whisperProgress: ModelDownloadProgress = {
    model: 'whisper',
    progress: 0,
    status: 'pending',
  };

  const updateProgress = () => {
    if (onProgress) {
      onProgress(kokoroProgress);
      onProgress(whisperProgress);
    }
  };

  // Start both downloads in parallel
  const kokoroPromise = preloadKokoroModel((progress) => {
    Object.assign(kokoroProgress, progress);
    updateProgress();
  }).catch((error) => {
    kokoroProgress.status = 'error';
    kokoroProgress.error =
      error instanceof Error ? error.message : 'Unknown error';
    updateProgress();
    // Don't throw - allow whisper to continue
  });

  const whisperPromise = preloadWhisperModel((progress) => {
    Object.assign(whisperProgress, progress);
    updateProgress();
  }).catch((error) => {
    whisperProgress.status = 'error';
    whisperProgress.error =
      error instanceof Error ? error.message : 'Unknown error';
    updateProgress();
    // Don't throw - allow kokoro to continue
  });

  // Wait for both to complete (or fail gracefully)
  await Promise.allSettled([kokoroPromise, whisperPromise]);
}
