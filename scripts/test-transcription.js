// Backend-only test script for transcription service
// This tests the backend transcription model directly (not via API)
// Useful for debugging backend issues in isolation
// Run with: bun run scripts/test-transcription.js
//
// Note: The frontend initialization tests the full user flow (frontend → API → backend)
// This script is for backend development/debugging only

import { pipeline } from '@huggingface/transformers';
import chalk from 'chalk';
import wavefile from 'wavefile';

// All samples contain spoken dialog for Whisper transcription testing
const TEST_AUDIO_URLS = {
  // JFK "Ask not what your country can do for you" - ~11s WAV, clear speech
  jfk: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav',
  // MLK speech excerpt - FLAC format
  mlk: 'https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac',
  // LibriVox poetry reading - longer spoken audio
  librivox:
    'https://ia800204.us.archive.org/11/items/short_poetry_collection_001_librivox/spCollection001_01_various_64kb.mp3',
};

async function downloadAudio(url) {
  console.log(chalk.cyan('Downloading audio from:'), url);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const chunks = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    if (total > 0) {
      const progress = ((receivedLength / total) * 100).toFixed(1);
      process.stdout.write(`\r${chalk.yellow('Progress:')} ${progress}%`);
    }
  }

  console.log(); // New line after progress
  console.log(
    chalk.green('Download complete:'),
    `${receivedLength.toLocaleString()} bytes`
  );

  const audioData = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    audioData.set(chunk, position);
    position += chunk.length;
  }

  return audioData.buffer;
}

function decodeWavAudio(audioBuffer) {
  const wav = new wavefile.WaveFile(new Uint8Array(audioBuffer));
  wav.toBitDepth('32f');
  wav.toSampleRate(16000);

  let samples = wav.getSamples();
  if (Array.isArray(samples)) {
    if (samples.length > 1) {
      // Downmix stereo to mono
      const SCALING_FACTOR = Math.sqrt(2);
      const left = samples[0];
      const right = samples[1];
      for (let i = 0; i < left.length; i++) {
        left[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
      }
    }
    samples = samples[0];
  }
  return samples;
}

async function testTranscription(audioUrl, modelId = 'Xenova/whisper-base') {
  console.log(chalk.bold.blue('\n=== Transcription Test ===\n'));
  console.log(chalk.cyan('Model:'), modelId);
  console.log(chalk.cyan('Audio:'), audioUrl);
  console.log();

  try {
    // Download audio
    const audioBuffer = await downloadAudio(audioUrl);

    // Load model
    console.log(chalk.cyan('Loading transcription model...'));
    const transcriptionModel = await pipeline(
      'automatic-speech-recognition',
      modelId,
      {
        device: 'cpu',
      }
    );
    console.log(chalk.green('Model loaded successfully'));

    // Decode WAV to Float32Array at 16kHz
    console.log(chalk.cyan('Decoding audio data...'));
    const audioData = decodeWavAudio(audioBuffer);
    console.log(
      chalk.green('Audio decoded:'),
      `${audioData.length.toLocaleString()} samples at 16kHz`
    );

    // Transcribe
    console.log(chalk.cyan('Running transcription...'));
    const startTime = Date.now();

    const result = await transcriptionModel(audioData, {
      language: 'en',
      task: 'transcribe',
      return_timestamps: true,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const text = result?.text || '';

    console.log(chalk.green('Transcription completed in'), `${duration}s`);
    console.log();
    console.log(chalk.bold.yellow('Result:'));
    console.log(chalk.white(text));
    console.log();

    if (result?.chunks && result.chunks.length > 0) {
      console.log(chalk.bold.yellow('Segments:'));
      result.chunks.forEach((chunk) => {
        const start = chunk.timestamp[0]?.toFixed(2) || '0.00';
        const end = chunk.timestamp[1]?.toFixed(2) || '0.00';
        console.log(
          chalk.gray(`[${start}s - ${end}s]`),
          chalk.white(chunk.text)
        );
      });
      console.log();
    }

    console.log(chalk.bold.green('✓ Test passed'));
    return true;
  } catch (error) {
    console.error(chalk.bold.red('✗ Test failed:'), error.message);
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'short';

  let audioUrl;
  switch (testType) {
    case 'short':
    case 'jfk':
      audioUrl = TEST_AUDIO_URLS.jfk;
      break;
    case 'mlk':
      audioUrl = TEST_AUDIO_URLS.mlk;
      break;
    case 'long':
    case 'librivox':
      audioUrl = TEST_AUDIO_URLS.librivox;
      break;
    default:
      audioUrl = testType; // Assume it's a custom URL
  }

  const modelId = args[1] || 'Xenova/whisper-base';

  console.log(chalk.bold.magenta('\n╔════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║  Transcription Service Test       ║'));
  console.log(chalk.bold.magenta('╚════════════════════════════════════╝\n'));

  const success = await testTranscription(audioUrl, modelId);

  console.log(chalk.bold.magenta('\n╔════════════════════════════════════╗'));
  console.log(
    chalk.bold.magenta('║  Test'),
    success ? chalk.green('PASSED') : chalk.red('FAILED'),
    chalk.bold.magenta('                   ║')
  );
  console.log(chalk.bold.magenta('╚════════════════════════════════════╝\n'));

  process.exit(success ? 0 : 1);
}

main();
