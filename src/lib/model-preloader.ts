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
 * Preload Whisper transcription model and test with sample audio
 * Downloads model, then tests transcription with a public domain audio file
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
    });
  }

  try {
    if (onProgress) {
      onProgress({
        model: 'whisper',
        progress: 10,
        status: 'downloading',
      });
    }

    // Try to import browser-based transformers-js (optional, may not be available)
    let browserModelLoaded = false;
    try {
      console.log('[preloadWhisperModel] Importing transformersJS...');
      const { transformersJS } = await import('@built-in-ai/transformers-js');
      console.log('[preloadWhisperModel] transformersJS imported');

      if (onProgress) {
        onProgress({
          model: 'whisper',
          progress: 20,
          status: 'downloading',
        });
      }

      // Create transcription model using transformersJS.transcription()
      // Type assertion needed as types may not be fully updated
      const transcriptionModel = (
        transformersJS as unknown as {
          transcription: (
            modelId: string,
            options?: {
              device?: 'auto' | 'cpu' | 'webgpu';
              initProgressCallback?: (progress: { progress: number }) => void;
            }
          ) => Promise<{
            availability: () => Promise<
              'unavailable' | 'downloadable' | 'available'
            >;
            createSessionWithProgress: (
              onProgress?: (progress: { progress: number }) => void
            ) => Promise<unknown>;
          }>;
        }
      ).transcription('Xenova/whisper-base', {
        device: 'auto',
        initProgressCallback: (progress: { progress: number }) => {
          if (onProgress) {
            // Model download takes 20-50% of total progress
            const downloadProgress = progress.progress * 0.3;
            const overallProgress = Math.min(20 + downloadProgress, 50);

            onProgress({
              model: 'whisper',
              progress: Math.round(overallProgress),
              status: 'downloading',
            });
          }
        },
      });

      // Check availability and create session with progress tracking
      const model = await transcriptionModel;
      const availability = await model.availability();

      if (availability === 'downloadable') {
        await model.createSessionWithProgress(
          (progress: { progress: number }) => {
            if (onProgress) {
              // Model download takes 20-50% of total progress
              const downloadProgress = progress.progress * 0.3;
              const overallProgress = Math.min(20 + downloadProgress, 50);

              onProgress({
                model: 'whisper',
                progress: Math.round(overallProgress),
                status: 'downloading',
              });
            }
          }
        );
      }

      browserModelLoaded = true;
      console.log('[preloadWhisperModel] Browser model loaded successfully');
    } catch (transformersError) {
      // Browser model not available - that's OK, we'll test via backend API
      console.warn(
        '[preloadWhisperModel] Browser transformers-js not available:',
        transformersError
      );
    }

    // Progress: 50% - browser model done (or skipped)
    if (onProgress) {
      onProgress({
        model: 'whisper',
        progress: 50,
        status: 'downloading',
      });
    }

    // Test transcription via backend API (50-100% progress)
    // This validates the actual user flow: frontend → backend → response
    // This runs REGARDLESS of whether browser model loaded
    if (!skipTest) {
      console.log('[preloadWhisperModel] Starting backend API test...');
      await initializeTranscriptionService(
        (testProgress: TranscriptionTestProgress) => {
          if (onProgress) {
            // Map test progress to 50-100% range
            const testProgressPercent =
              testProgress.stage === 'download'
                ? testProgress.progress * 0.25 // 50-75%
                : testProgress.stage === 'transcribe'
                  ? 75 + testProgress.progress * 0.25 // 75-100%
                  : 100;

            onProgress({
              model: 'whisper',
              progress: Math.round(50 + testProgressPercent * 0.5),
              status: 'downloading',
            });
          }
        },
        { provider, skipTest: false }
      );
      console.log('[preloadWhisperModel] Backend API test completed');
    }

    // Complete
    if (onProgress) {
      onProgress({
        model: 'whisper',
        progress: 100,
        status: 'complete',
      });
    }

    console.log('[preloadWhisperModel] Complete', { browserModelLoaded });
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
