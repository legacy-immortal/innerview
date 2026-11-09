/**
 * @file Transcription startup initialization and end-to-end test audio validation.
 * @module lib/transcription/transcription-init.ts
 */
// Transcription initialization and testing
// Downloads a test audio file and validates transcription service during startup

import { transcriptionService } from './transcription-service';

export interface TranscriptionSegment {
  text: string;
  startSecond: number;
  endSecond: number;
}

export interface TranscriptionTestProgress {
  stage: 'download' | 'transcribe' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
  result?: {
    text: string;
    duration?: number;
    provider: string;
    segments?: TranscriptionSegment[];
  };
}

export type TranscriptionTestCallback = (
  progress: TranscriptionTestProgress
) => void;

// Test audio URLs - use server proxy to bypass CORS restrictions
// The server proxies these external URLs: /api/test-audio/:sampleId
// All samples contain spoken dialog for Whisper transcription testing
const TEST_AUDIO_URL = '/api/test-audio/jfk';

// Alternative test files (via server proxy)
const ALTERNATIVE_TEST_URLS = [
  '/api/test-audio/mlk',
  '/api/test-audio/librivox',
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
 * Test transcription service end-to-end
 * Downloads audio, posts to backend API, validates response
 * This tests the actual user flow: frontend → backend → response
 */
export async function testTranscriptionService(
  onProgress?: TranscriptionTestCallback,
  options: {
    provider?: 'openai' | 'local';
    useShortSample?: boolean;
    testBackendAPI?: boolean; // If true, tests via API; if false, tests direct service
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
        const statusResponse = await fetch('/api/transcription/status');
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
            // Trigger model preload
            if (onProgress) {
              onProgress({
                stage: 'download',
                progress: 5,
                message: 'Initializing backend transcription model...',
              });
            }
            await fetch('/api/transcription/preload', { method: 'POST' });
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

      const response = await fetch('/api/transcription', {
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
 * Initialize and validate transcription service
 * Should be called during app startup
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
  });

  return result.success;
}

/**
 * Stream audio from URL and transcribe
 * Alternative to downloading entire file first
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
