// PCM AudioWorklet Processor for streaming audio

export interface PCMProcessorNode extends AudioWorkletNode {
  port: MessagePort;
}

export interface BufferStatus {
  bufferUsed: number;
  bufferTotal: number;
  bufferPercent: number;
  isUnderrun: boolean;
  underrunCount: number;
  sampleRate: number;
}

export interface ProcessorError {
  action: 'error';
  error: string;
}

/**
 * Initialize PCM processor AudioWorklet
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

  // Create processor node
  const processorNode = new AudioWorkletNode(
    audioContext,
    'pcm-processor'
  ) as PCMProcessorNode;

  return processorNode;
}

/**
 * Stream PCM data to processor node
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
 * Set volume on processor node
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
 * Clear processor buffer
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
 * Get processor buffer status
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
 * Set processor sample rate
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

