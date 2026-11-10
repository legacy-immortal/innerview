/**
 * @file audio-converter.ts — Converts WAV audio to 16-bit PCM and reads sample rates.
 * @module lib/tts/utils/audio-converter
 *
 * Audio format conversion utilities for the streaming TTS pipeline. Extracts
 * raw PCM samples from WAV containers and reads the sample rate from the WAV
 * header so the PCM AudioWorklet processor can be fed the correct format.
 */

/**
 * Convert WAV audio data to 16-bit PCM.
 * Removes the WAV header (locating the 'data' chunk) and extracts raw PCM
 * samples as an Int16Array. Odd-length payloads are zero-padded to keep the
 * 16-bit sample alignment intact.
 * @param wavData - Raw WAV file bytes.
 * @returns 16-bit PCM samples.
 * @throws When the data is too short or missing the RIFF header.
 */
export function convertWavToPCM(wavData: Uint8Array): Int16Array {
  // WAV header is typically 44 bytes; anything shorter cannot be valid.
  if (wavData.length < 44) {
    throw new Error('Invalid WAV file: too short');
  }

  // Verify RIFF header — required for a well-formed WAV container.
  const riffHeader = String.fromCharCode(...wavData.slice(0, 4));
  if (riffHeader !== 'RIFF') {
    throw new Error('Invalid WAV file: missing RIFF header');
  }

  // Locate the 'data' chunk. The standard header is 44 bytes, but some
  // encoders insert extra chunks, so scan a bounded window for the marker.
  let dataOffset = 44;
  const dataChunkMarker = new Uint8Array([0x64, 0x61, 0x74, 0x61]); // 'data'

  // Search for data chunk (should be at offset 36 or later)
  for (let i = 36; i < Math.min(wavData.length - 4, 100); i++) {
    let found = true;
    for (let j = 0; j < 4; j++) {
      if (wavData[i + j] !== dataChunkMarker[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      dataOffset = i + 8; // Skip 'data' marker (4 bytes) and size (4 bytes)
      break;
    }
  }

  // Extract PCM data (everything after the data chunk header)
  const pcmData = wavData.slice(dataOffset);

  // Convert to Int16Array (16-bit PCM)
  if (pcmData.length % 2 !== 0) {
    // Odd number of bytes - pad with zero so the Int16 view stays aligned
    const padded = new Uint8Array(pcmData.length + 1);
    padded.set(pcmData);
    return new Int16Array(padded.buffer);
  }

  return new Int16Array(pcmData.buffer);
}

/**
 * Get WAV file sample rate from header.
 * Reads the little-endian sample rate at WAV header offset 24-27. Falls back
 * to 24000 Hz (Kokoro's default) when the value is missing or zero.
 * @param wavData - Raw WAV file bytes.
 * @returns Sample rate in Hz, or 24000 when unreadable.
 */
export function getWavSampleRate(wavData: Uint8Array): number {
  if (wavData.length < 44) {
    return 24000; // Default fallback (Kokoro sample rate)
  }

  // Sample rate is at offset 24-27 (little-endian) in the WAV fmt chunk
  const sampleRate = new DataView(wavData.buffer).getUint32(24, true);
  return sampleRate || 24000;
}

/**
 * Concat multiple audio chunks into single array.
 * Copies each chunk into a fresh Uint8Array so the result owns its buffer.
 * @param chunks - Audio chunks to concatenate.
 * @returns A single Uint8Array containing all chunks in order.
 */
export function concatAudioChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

