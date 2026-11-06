// Backend transcription initialization test
// Tests transcription service with a sample audio file during server startup

import { logTranscription as logger } from '../logger.js';
import { transcriptionService } from '../services/transcription-service.js';

// Test samples with actual spoken dialog for Whisper transcription
const TEST_URLS = [
  // JFK "Ask not what your country can do for you" - ~11s WAV, clear speech
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav',
  // MLK speech excerpt - FLAC format
  'https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac',
];

export interface TranscriptionTestResult {
  success: boolean;
  text?: string;
  duration?: number;
  error?: string;
  modelId?: string;
}

/**
 * Download audio file from URL
 */
async function downloadAudioFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.statusText}`);
  }

  return await response.arrayBuffer();
}

/**
 * Test transcription service with sample audio
 */
export async function testTranscriptionService(): Promise<TranscriptionTestResult> {
  const modelId = transcriptionService.getModelId();

  try {
    logger.info('Starting transcription test');
    logger.info('Model: %s', modelId);

    // Step 1: Download test audio (JFK speech sample with actual dialog)
    const testUrl = TEST_URLS[0];
    logger.info('Downloading test audio from: %s', testUrl);

    let audioBuffer: ArrayBuffer;
    try {
      audioBuffer = await downloadAudioFile(testUrl);
      logger.info('Audio downloaded, size: %s bytes', audioBuffer.byteLength);
    } catch {
      // Try alternative URL
      logger.info('Trying alternative test URL');
      audioBuffer = await downloadAudioFile(TEST_URLS[1]);
    }

    // Step 2: Run transcription using the service
    logger.info('Running transcription');
    const startTime = Date.now();

    const result = await transcriptionService.transcribe(audioBuffer, {
      language: 'en',
    });

    const duration = (Date.now() - startTime) / 1000;

    logger.info('Transcription completed in %ss', duration.toFixed(2));
    logger.info('Result: %s', result.text.substring(0, 100));

    return {
      success: true,
      text: result.text,
      duration,
      modelId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error('Transcription test failed: %s', errorMessage);

    return {
      success: false,
      error: errorMessage,
      modelId,
    };
  }
}

/**
 * Initialize transcription service and run test
 * Call this during server startup
 */
export async function initializeTranscription(
  options: {
    skipTest?: boolean;
  } = {}
): Promise<boolean> {
  const { skipTest = false } = options;

  if (skipTest) {
    logger.info('Transcription test skipped');
    return true;
  }

  logger.info('Initializing transcription service');

  // First, preload the model
  try {
    await transcriptionService.preload();
  } catch (error) {
    logger.error(
      'Failed to preload transcription model: %s',
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }

  // Then run the test
  const result = await testTranscriptionService();

  if (result.success) {
    logger.info('Transcription service initialized successfully');
    return true;
  } else {
    logger.error(
      'Transcription service initialization failed: %s',
      result.error
    );
    return false;
  }
}
