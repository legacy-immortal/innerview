#!/usr/bin/env node
/**
 * Download Whisper model files for backend transcription
 * Run with: bun run server/scripts/download-whisper-model.js
 */

import { pipeline } from '@huggingface/transformers';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Model to download
const MODEL_ID = 'onnx-community/whisper-tiny.en';

// Cache directory
const CACHE_DIR = join(__dirname, '..', 'models', 'whisper-cache');

async function downloadModel() {
  console.log('='.repeat(60));
  console.log('Whisper Model Downloader');
  console.log('='.repeat(60));
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Cache directory: ${CACHE_DIR}`);
  console.log('');

  // Ensure cache directory exists
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
    console.log(`Created cache directory: ${CACHE_DIR}`);
  }

  console.log('Starting model download...');
  console.log('This may take a few minutes depending on your connection.');
  console.log('');

  try {
    const model = await pipeline('automatic-speech-recognition', MODEL_ID, {
      device: 'cpu',
      cache_dir: CACHE_DIR,
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          let percent = 0;
          if (typeof progress.progress === 'number') {
            percent = Math.round(progress.progress * 100);
          } else if (progress.loaded && progress.total) {
            percent = Math.round((progress.loaded / progress.total) * 100);
          }
          process.stdout.write(
            `\rDownloading ${progress.file || 'file'}: ${percent}%`
          );
        } else if (progress.status === 'ready') {
          console.log(`\n✓ Ready: ${progress.file || 'model'}`);
        } else if (progress.status === 'initiate') {
          console.log(`Starting: ${progress.file || 'model'}`);
        }
      },
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('Model downloaded successfully!');
    console.log('='.repeat(60));

    // Test the model
    console.log('');
    console.log('Testing model with sample audio...');

    // Create a simple test audio (silence)
    const testAudio = new Float32Array(16000); // 1 second of silence at 16kHz

    const result = await model(testAudio, {
      language: 'en',
      task: 'transcribe',
    });

    console.log('Model test result:', result);
    console.log('');
    console.log('Model is ready for use!');
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('Error downloading model:');
    console.error(error.message);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

downloadModel();
