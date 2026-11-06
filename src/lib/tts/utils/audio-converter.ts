// Audio format conversion utilities

/**
 * Convert WAV audio data to 16-bit PCM
 * Removes WAV header and extracts raw PCM samples
 */
export function convertWavToPCM(wavData: Uint8Array): Int16Array {
  // WAV header is typically 44 bytes
  // Check for RIFF header
  if (wavData.length < 44) {
    throw new Error('Invalid WAV file: too short');
  }

  // Verify RIFF header
  const riffHeader = String.fromCharCode(
    ...wavData.slice(0, 4)
  );
  if (riffHeader !== 'RIFF') {
    throw new Error('Invalid WAV file: missing RIFF header');
  }

  // Find data chunk (skip header and format chunk)
  // Standard WAV header is 44 bytes, but we'll search for 'data' chunk
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

  // Extract PCM data (skip header)
  const pcmData = wavData.slice(dataOffset);

  // Convert to Int16Array (16-bit PCM)
  if (pcmData.length % 2 !== 0) {
    // Odd number of bytes - pad with zero
    const padded = new Uint8Array(pcmData.length + 1);
    padded.set(pcmData);
    return new Int16Array(padded.buffer);
  }

  return new Int16Array(pcmData.buffer);
}

/**
 * Get WAV file sample rate from header
 */
export function getWavSampleRate(wavData: Uint8Array): number {
  if (wavData.length < 44) {
    return 24000; // Default fallback
  }

  // Sample rate is at offset 24-27 (little-endian)
  const sampleRate = new DataView(wavData.buffer).getUint32(24, true);
  return sampleRate || 24000;
}

/**
 * Concat multiple audio chunks into single array
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

