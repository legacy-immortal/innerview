/**
 * @file pcm-processor.ts — PCM AudioWorklet processor for streaming TTS audio.
 * @module lib/tts/utils/pcm-processor
 *
 * PCM AudioWorklet Processor for streaming audio. Loads the compiled
 * processor module, streams Int16 PCM chunks to the worker node over a
 * MessagePort, and exposes volume, buffer-clear, status, and sample-rate
 * controls used by the streaming TTS service for visualization and playback.
 */

/**
 * Shape of an AudioWorkletNode whose port is a MessagePort (the PCM
 * processor exposes control commands via postMessage).
 */
export interface PCMProcessorNode extends AudioWorkletNode {
  port: MessagePort;
}

/**
 * Buffer status reported back by the PCM processor worker.
 */
export interface BufferStatus {
  /** Samples currently buffered. */
  bufferUsed: number;
  /** Total buffer capacity. */
  bufferTotal: number;
  /** bufferUsed / bufferTotal as 0-1. */
  bufferPercent: number;
  /** Whether the buffer has run dry. */
  isUnderrun: boolean;
  /** Number of underrun events. */
  underrunCount: number;
  /** Sample rate in Hz. */
  sampleRate: number;
}

/**
 * Error payload posted by the PCM processor worker.
 */
export interface ProcessorError {
  action: 'error';
  error: string;
}

/**
 * Initialize PCM processor AudioWorklet.
 * Loads the compiled processor module from the tts/ output directory and
 * creates an AudioWorkletNode wired to the 'pcm-processor' name.
 * @param audioContext - Audio context to create the processor on.
 * @returns The created processor node.
 * @throws When the module fails to load.
 */
export async function createPCMProcessor(
  audioContext: AudioContext
): Promise<PCMProcessorNode> {
  // Load PCM processor module
  // Path: src/lib/tts/utils/pcm-processor.ts -> tts/lib/pcm-processor.js
  const processorUrl = new URL(
    '../../../../tts/lib/pcm-processor.js',
    import.meta.url
  );

  await audioContext.audioWorklet.addModule(processorUrl);

  // Create processor node typed as PCMProcessorNode so callers can use .port
  const processorNode = new AudioWorkletNode(
    audioContext,
    'pcm-processor'
  ) as PCMProcessorNode;

  return processorNode;
}

/**
 * Stream PCM data to processor node.
 * Copies the Int16 data into a fresh ArrayBuffer so the transferable
 * payload is always a plain ArrayBuffer (never ArrayBufferLike /
 * SharedArrayBuffer) and respects the view's byte offset and length.
 * @param processorNode - Initialized PCM processor node.
 * @param pcmData - Non-empty Int16 PCM samples.
 * @param sampleRate - Optional sample rate hint forwarded to the worker.
 * @throws When the node is uninitialized or PCM data is invalid.
 */
export function streamPCMToProcessor(
  processorNode: PCMProcessorNode,
  pcmData: Int16Array,
  sampleRate?: number
): void {
  if (!processorNode || !processorNode.port) {
    throw new Error('Processor node is not initialized');
  }

  if (!(pcmData instanceof Int16Array) || pcmData.length === 0) {
    throw new Error('Invalid PCM data: expected non-empty Int16Array');
  }

  // Copy into a freshly allocated ArrayBuffer so the transferable payload
  // is always an ArrayBuffer (never ArrayBufferLike/SharedArrayBuffer) and
  // respects the view's byte offset and length.
  const pcmCopy = new Int16Array(pcmData);
  const message: { pcmData: ArrayBuffer; sampleRate?: number } = {
    pcmData: pcmCopy.buffer,
  };

  if (sampleRate !== undefined) {
    message.sampleRate = sampleRate;
  }

  try {
    processorNode.port.postMessage(message);
  } catch (error) {
    throw new Error(`Failed to send PCM data: ${error}`);
  }
}

/**
 * Set volume on processor node.
 * Clamps volume to a minimum of 0 (no upper bound, allowing amplification).
 * @param processorNode - Initialized PCM processor node.
 * @param volume - Volume multiplier (0 = silent).
 * @throws When the node is uninitialized.
 */
export function setProcessorVolume(
  processorNode: PCMProcessorNode,
  volume: number
): void {
  if (!processorNode || !processorNode.port) {
    throw new Error('Processor node is not initialized');
  }

  const clampedVolume = Math.max(0, volume);

  try {
    processorNode.port.postMessage({
      volume: clampedVolume,
    });
  } catch (error) {
    throw new Error(`Failed to set volume: ${error}`);
  }
}

/**
 * Clear processor buffer.
 * Posts a 'clear' command and resolves when the worker replies 'cleared',
 * or rejects with the worker's error or after a 1s timeout.
 * @param processorNode - Initialized PCM processor node.
 * @returns Resolves when the buffer is cleared.
 * @throws When the node is uninitialized or the clear times out/errors.
 */
export function clearProcessorBuffer(
  processorNode: PCMProcessorNode
): Promise<void> {
  if (!processorNode || !processorNode.port) {
    throw new Error('Processor node is not initialized');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      processorNode.port.removeEventListener('message', handler);
      reject(new Error('Buffer clear timeout'));
    }, 1000);

    const handler = (event: MessageEvent) => {
      if (event.data.action === 'cleared') {
        clearTimeout(timeout);
        processorNode.port.removeEventListener('message', handler);
        resolve();
      } else if (event.data.action === 'error') {
        clearTimeout(timeout);
        processorNode.port.removeEventListener('message', handler);
        reject(new Error(event.data.error));
      }
    };

    processorNode.port.addEventListener('message', handler);
    processorNode.port.postMessage({ action: 'clear' });
  });
}

/**
 * Get processor buffer status.
 * Posts a 'getStatus' command and resolves with the worker's status reply,
 * or rejects on error or after a 1s timeout.
 * @param processorNode - Initialized PCM processor node.
 * @returns Buffer status reported by the worker.
 * @throws When the node is uninitialized or the request times out/errors.
 */
export function getProcessorStatus(
  processorNode: PCMProcessorNode
): Promise<BufferStatus> {
  if (!processorNode || !processorNode.port) {
    throw new Error('Processor node is not initialized');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      processorNode.port.removeEventListener('message', handler);
      reject(new Error('Status request timeout'));
    }, 1000);

    const handler = (event: MessageEvent) => {
      if (event.data.action === 'status') {
        clearTimeout(timeout);
        processorNode.port.removeEventListener('message', handler);
        resolve(event.data);
      } else if (event.data.action === 'error') {
        clearTimeout(timeout);
        processorNode.port.removeEventListener('message', handler);
        reject(new Error(event.data.error));
      }
    };

    processorNode.port.addEventListener('message', handler);
    processorNode.port.postMessage({ action: 'getStatus' });
  });
}

/**
 * Set processor sample rate.
 * Clamps to [8000, 48000] Hz before forwarding to the worker. Resolves with
 * the applied sample rate, or rejects on error/timeout.
 * @param processorNode - Initialized PCM processor node.
 * @param sampleRate - Requested sample rate in Hz.
 * @returns The clamped sample rate actually applied.
 * @throws When the node is uninitialized or the request times out/errors.
 */
export function setProcessorSampleRate(
  processorNode: PCMProcessorNode,
  sampleRate: number
): Promise<number> {
  if (!processorNode || !processorNode.port) {
    throw new Error('Processor node is not initialized');
  }

  const clampedSampleRate = Math.max(8000, Math.min(48000, sampleRate));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      processorNode.port.removeEventListener('message', handler);
      reject(new Error('Sample rate update timeout'));
    }, 1000);

    const handler = (event: MessageEvent) => {
      if (event.data.action === 'sampleRateUpdated') {
        clearTimeout(timeout);
        processorNode.port.removeEventListener('message', handler);
        resolve(event.data.sampleRate);
      } else if (event.data.action === 'error') {
        clearTimeout(timeout);
        processorNode.port.removeEventListener('message', handler);
        reject(new Error(event.data.error));
      }
    };

    processorNode.port.addEventListener('message', handler);
    processorNode.port.postMessage({
      action: 'setSampleRate',
      sampleRate: clampedSampleRate,
    });
  });
}

