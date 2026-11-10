/**
 * @file transcription-init.ts — Transcription startup init and end-to-end test audio validation.
 * @module lib/transcription/transcription-init
 *
 * Transcription initialization and testing. Downloads a test audio file and
 * validates the transcription service during startup, with optional backend
 * Whisper model preload progress polling. Consumed by the performance
 * startup hook and settings test panels.
 */
// Transcription initialization and testing
// Downloads a test audio file and validates transcription service during startup

import { apiUrl } from '../api-base';
import { transcriptionService } from './transcription-service';

/**
 * A single transcription segment with start and end times.
 */
export interface TranscriptionSegment {
  /** Segment text. */
  text: string;
  /** Start time in seconds. */
  startSecond: number;
  /** End time in seconds. */
  endSecond: number;
}

/**
 * Progress reported during a transcription test via onProgress.
 * progress is 0-100; result is only present on the 'complete' stage.
 */
export interface TranscriptionTestProgress {
  stage: 'download' | 'transcribe' | 'complete' | 'error';
  /** Progress percentage (0-100). */
  progress: number;
  /** Human-readable status message. */
  message: string;
  /** Error message when stage is 'error'. */
  error?: string;
  /** Result details, present on the 'complete' stage. */
  result?: {
    text: string;
    duration?: number;
    provider: string;
    segments?: TranscriptionSegment[];
  };
  /** Detailed per-file model download info from the backend preload. */
  file?: string | null;
  /** Bytes received for the current file. */
  loaded?: number;
  /** Total bytes for the current file (0 when unknown). */
  total?: number;
  /** Download speed in bytes/sec (0 when unknown). */
  bytesPerSecond?: number;
  /** Number of files that have finished downloading. */
  filesCompleted?: number;
}

/**
 * Callback type for transcription test progress updates.
 * @param progress - Progress report for the current stage.
 */
export type TranscriptionTestCallback = (
  progress: TranscriptionTestProgress
) => void;

/** Shape of GET /api/transcription/status (existing API + additive progress). */
interface BackendTranscriptionStatus {
  ready: boolean;
  loading: boolean;
  failed: boolean;
  error?: string | null;
  progress?: {
    phase?: string;
    file?: string | null;
    loaded?: number;
    total?: number;
    percent?: number;
    bytesPerSecond?: number;
    filesCompleted?: number;
    message?: string;
  };
}

/**
 * Poll GET /api/transcription/status while the backend Whisper model preload
 * runs, reporting per-file progress (file, loaded/total, %, speed) via
 * onProgress. Resolves when the preload settles. Reuses the existing status
 * endpoint (extended with additive `progress`); falls back silently if the
 * server predates it.
 */
async function pollBackendPreloadProgress(
  onProgress: TranscriptionTestCallback | undefined,
  preloadRequest: Promise<unknown>
): Promise<void> {
  let settled = false;
  void preloadRequest.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    }
  );
  for (;;) {
    try {
      const response = await fetch(apiUrl('/api/transcription/status'));
      if (response.ok) {
        const status = (await response.json()) as BackendTranscriptionStatus;
        const p = status.progress;
        if (p) {
          onProgress?.({
            stage: status.failed ? 'error' : 'download',
            progress: p.percent ?? 0,
            message:
              p.message ||
              (status.ready
                ? 'Backend Whisper model ready'
                : 'Downloading backend Whisper model...'),
            file: p.file ?? null,
            loaded: p.loaded,
            total: p.total,
            bytesPerSecond: p.bytesPerSecond,
            filesCompleted: p.filesCompleted,
            error: status.failed
              ? (status.error ?? 'Model load failed')
              : undefined,
          });
        }
        if (status.ready || status.failed) return;
      }
    } catch {
      // Status check failed — the preload request itself will surface errors.
    }
    if (settled) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

// Test audio URLs - use server proxy to bypass CORS restrictions
// The server proxies these external URLs: /api/test-audio/:sampleId
// All samples contain spoken dialog for Whisper transcription testing
const TEST_AUDIO_URL = apiUrl('/api/test-audio/jfk');

// Alternative test files (via server proxy)
const ALTERNATIVE_TEST_URLS = [
  apiUrl('/api/test-audio/mlk'),
  apiUrl('/api/test-audio/librivox'),
];

/**
 * Download audio file with progress tracking
 */
async function downloadAudioFile(
  url: string,
  onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    if (total > 0 && onProgress) {
      const progress = (receivedLength / total) * 100;
      onProgress(progress);
    }
  }

  // Concatenate chunks into single ArrayBuffer
  const audioData = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    audioData.set(chunk, position);
    position += chunk.length;
  }

  return audioData.buffer;
}

/**
 * Test transcription service end-to-end.
 * Downloads test audio, checks backend transcription status (optionally
 * preloading the backend Whisper model when allowModelPreload is set),
 * transcribes, and validates the response. This tests the real user flow:
 * frontend → backend → response.
 *
 * Backend model preload is opt-in only: without allowModelPreload the test
 * never triggers a download and lets the transcription POST surface its own
 * error.
 * @param onProgress - Optional progress callback invoked per stage.
 * @param options - Test options (provider, short sample, backend API, preload opt-in).
 * @returns Success flag plus text/duration/error.
 * @example
 * ```ts
 * const result = await testTranscriptionService((p) => console.log(p.stage, p.progress), {
 *   provider: 'local',
 *   useShortSample: true,
 *   allowModelPreload: true,
 * });
 * ```
 */
export async function testTranscriptionService(
  onProgress?: TranscriptionTestCallback,
  options: {
    provider?: 'openai' | 'local';
    useShortSample?: boolean;
    testBackendAPI?: boolean; // If true, tests via API; if false, tests direct service
    /**
     * Explicit opt-in for triggering a backend Whisper model download
     * (POST /api/transcription/preload) when the model is not ready.
     * Defaults to `false`: the test then never preloads — it only reports
     * progress and lets the transcription POST surface its own error.
     * Pass `true` only from explicit user actions (bootstrap during
     * startup, or a Settings "Run Test" click with visible progress UI).
     */
    allowModelPreload?: boolean;
  } = {}
): Promise<{
  success: boolean;
  text?: string;
  duration?: number;
  error?: string;
}> {
  const {
    provider = 'local',
    useShortSample = false,
    testBackendAPI = true,
    allowModelPreload = false,
  } = options;

  console.log('[testTranscriptionService] Starting...', {
    provider,
    useShortSample,
    testBackendAPI,
  });

  try {
    // Check backend status first if using backend API
    if (testBackendAPI && provider === 'local') {
      if (onProgress) {
        onProgress({
          stage: 'download',
          progress: 0,
          message: 'Checking backend transcription status...',
        });
      }

      try {
        const statusResponse = await fetch(apiUrl('/api/transcription/status'));
        if (statusResponse.ok) {
          const status = (await statusResponse.json()) as {
            ready: boolean;
            loading: boolean;
            failed: boolean;
            error?: string;
          };

          if (status.failed && status.error) {
            throw new Error(
              `Backend transcription model failed to load: ${status.error}. ` +
                'The Whisper model may need to be downloaded manually or there may be a network issue.'
            );
          }

          if (!status.ready && !status.loading) {
            // Model preload is opt-in only: never auto-download post-bootstrap
            // without an explicit allowModelPreload from the caller (e.g.
            // bootstrap, or a Settings test click). Without it, skip the
            // preload and let the transcription POST surface its own error.
            if (allowModelPreload) {
              // Trigger model preload and report detailed progress while it
              // downloads (per-file, %, speed) instead of blocking silently.
              if (onProgress) {
                onProgress({
                  stage: 'download',
                  progress: 5,
                  message: 'Initializing backend transcription model...',
                });
              }
              const preloadRequest = fetch(
                apiUrl('/api/transcription/preload'),
                {
                  method: 'POST',
                }
              );
              await pollBackendPreloadProgress(onProgress, preloadRequest);
              await preloadRequest;
            }
          } else if (status.loading) {
            // Preload already in flight (e.g. started by PerformanceStartup):
            // report its detailed progress instead of waiting blindly.
            await pollBackendPreloadProgress(onProgress, Promise.resolve());
          }
        }
      } catch (statusError) {
        // If status check fails, continue anyway - the transcription call will fail with a better error
        console.warn(
          '[testTranscriptionService] Status check failed:',
          statusError
        );
      }
    }

    // Stage 1: Download audio file
    if (onProgress) {
      onProgress({
        stage: 'download',
        progress: 10,
        message: 'Downloading test audio file...',
      });
    }

    // JFK sample (~11s) for quick tests, librivox for longer tests
    const testUrl = useShortSample ? TEST_AUDIO_URL : ALTERNATIVE_TEST_URLS[1];
    console.log('[testTranscriptionService] Downloading from:', testUrl);
    let audioData: ArrayBuffer;

    try {
      audioData = await downloadAudioFile(testUrl, (downloadProgress) => {
        if (onProgress) {
          onProgress({
            stage: 'download',
            progress: downloadProgress,
            message: `Downloading test audio: ${Math.round(downloadProgress)}%`,
          });
        }
      });
    } catch (downloadError) {
      // Try MLK fallback if primary fails
      if (onProgress) {
        onProgress({
          stage: 'download',
          progress: 0,
          message: 'Primary download failed, trying alternative...',
        });
      }

      try {
        audioData = await downloadAudioFile(
          ALTERNATIVE_TEST_URLS[0],
          (downloadProgress) => {
            if (onProgress) {
              onProgress({
                stage: 'download',
                progress: downloadProgress,
                message: `Downloading alternative audio: ${Math.round(downloadProgress)}%`,
              });
            }
          }
        );
      } catch {
        throw downloadError;
      }
    }

    if (onProgress) {
      onProgress({
        stage: 'download',
        progress: 100,
        message: 'Download complete',
      });
    }

    // Stage 2: Transcribe audio
    if (onProgress) {
      onProgress({
        stage: 'transcribe',
        progress: 0,
        message: `Testing transcription with ${provider} provider...`,
      });
    }

    let result;

    if (testBackendAPI && provider === 'local') {
      // Test via backend API (real user flow for backend transcription)
      console.log('[testTranscriptionService] Testing via backend API...');
      const formData = new FormData();
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      formData.append('audio', audioBlob, 'test-audio.wav');
      formData.append('language', 'en');
      formData.append('task', 'transcribe');

      const response = await fetch(apiUrl('/api/transcription'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Try to get error details from response body
        let errorDetail = response.statusText;
        try {
          const errorData = (await response.json()) as {
            error?: string;
            message?: string;
          };
          errorDetail =
            errorData.message || errorData.error || response.statusText;
        } catch {
          // Ignore JSON parse errors
        }

        // Provide user-friendly error messages
        if (
          errorDetail.includes('Unable to get model file') ||
          errorDetail.includes('Failed to initialize')
        ) {
          throw new Error(
            'Backend transcription model not available. The Whisper model may still be downloading or failed to load. Try again later or switch to browser-based transcription.'
          );
        }

        throw new Error(`Backend API error: ${errorDetail}`);
      }

      const data = (await response.json()) as {
        text: string;
        duration?: number;
        segments?: Array<{
          text: string;
          startSecond: number;
          endSecond: number;
        }>;
      };

      result = {
        text: data.text,
        duration: data.duration,
        segments: data.segments,
      };
    } else {
      // Test via direct service call (for OpenAI or browser-based local transcription)
      const audioArray = new Uint8Array(audioData);
      result = await transcriptionService.transcribe(audioArray, {
        provider,
        language: 'en',
      });
    }

    if (onProgress) {
      onProgress({
        stage: 'transcribe',
        progress: 100,
        message: 'Transcription complete',
      });
    }

    // Stage 3: Complete
    const segments = result.segments || [];
    console.log(
      '[testTranscriptionService] Transcription complete:',
      `${segments.length} segments`
    );
    if (segments.length > 0) {
      console.log('[testTranscriptionService] Segments:', segments);
    }

    if (onProgress) {
      onProgress({
        stage: 'complete',
        progress: 100,
        message: `Transcription complete: ${segments.length} segment(s)`,
        result: {
          text: result.text,
          duration: result.duration,
          provider,
          segments,
        },
      });
    }

    return {
      success: true,
      text: result.text,
      duration: result.duration,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (onProgress) {
      onProgress({
        stage: 'error',
        progress: 0,
        message: 'Transcription test failed',
        error: errorMessage,
      });
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Initialize and validate transcription service.
 * Should be called during app bootstrap. Runs a short-sample transcription
 * test with backend model preload opt-in so the model is ready for first use.
 * @param onProgress - Optional progress callback invoked per stage.
 * @param options - Initialization options (skipTest, provider).
 * @returns True when initialization (or skipped test) succeeded.
 */
export async function initializeTranscriptionService(
  onProgress?: TranscriptionTestCallback,
  options: {
    skipTest?: boolean;
    provider?: 'openai' | 'local';
  } = {}
): Promise<boolean> {
  const { skipTest = false, provider = 'local' } = options;

  if (skipTest) {
    if (onProgress) {
      onProgress({
        stage: 'complete',
        progress: 100,
        message: 'Transcription service initialized (test skipped)',
      });
    }
    return true;
  }

  if (onProgress) {
    onProgress({
      stage: 'download',
      progress: 0,
      message: 'Initializing transcription service...',
    });
  }

  const result = await testTranscriptionService(onProgress, {
    provider,
    useShortSample: true, // Use short sample for faster initialization
    // Bootstrap path: downloading the backend model is the point of this
    // call, with detailed progress surfaced on the startup screen.
    allowModelPreload: true,
  });

  return result.success;
}

/**
 * Stream audio from URL and transcribe.
 * Downloads the audio from a URL then transcribes it. Alternative to
 * downloading the entire file first (this implementation still downloads
 * fully before transcribing, but exposes a URL-based API).
 * @param url - Audio URL to fetch and transcribe.
 * @param onProgress - Optional progress callback invoked per stage.
 * @param options - Transcribe options (provider, language).
 * @returns Success flag plus text/duration/error.
 */
export async function transcribeFromURL(
  url: string,
  onProgress?: TranscriptionTestCallback,
  options: {
    provider?: 'openai' | 'local';
    language?: string;
  } = {}
): Promise<{
  success: boolean;
  text?: string;
  duration?: number;
  error?: string;
}> {
  const { provider = 'local', language = 'en' } = options;

  try {
    if (onProgress) {
      onProgress({
        stage: 'download',
        progress: 0,
        message: 'Fetching audio from URL...',
      });
    }

    const audioData = await downloadAudioFile(url, (downloadProgress) => {
      if (onProgress) {
        onProgress({
          stage: 'download',
          progress: downloadProgress,
          message: `Downloading: ${Math.round(downloadProgress)}%`,
        });
      }
    });

    if (onProgress) {
      onProgress({
        stage: 'transcribe',
        progress: 0,
        message: 'Transcribing audio...',
      });
    }

    const audioArray = new Uint8Array(audioData);
    const result = await transcriptionService.transcribe(audioArray, {
      provider,
      language,
    });

    if (onProgress) {
      onProgress({
        stage: 'complete',
        progress: 100,
        message: 'Transcription complete',
        result: {
          text: result.text,
          duration: result.duration,
          provider,
        },
      });
    }

    return {
      success: true,
      text: result.text,
      duration: result.duration,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (onProgress) {
      onProgress({
        stage: 'error',
        progress: 0,
        message: 'Transcription failed',
        error: errorMessage,
      });
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
