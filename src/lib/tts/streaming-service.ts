/**
 * @file streaming-service.ts — Streams TTS model chunks to the PCM AudioWorklet processor.
 * @module lib/tts/streaming-service
 *
 * Streaming TTS service bridging model chunks to the PCM AudioWorklet
 * processor. Manages the AudioContext, PCM processor node, and analyser node
 * for real-time streaming playback and visualization, including mobile/iOS
 * autoplay workarounds and buffer status reporting.
 */
import type { StreamingTTSModel, TTSOptions } from './types';
import { convertWavToPCM, getWavSampleRate } from './utils/audio-converter';
import { isIOS, isMobile } from './utils/mobile-detection';
import {
  clearProcessorBuffer,
  createPCMProcessor,
  getProcessorStatus,
  setProcessorVolume,
  streamPCMToProcessor,
  type BufferStatus,
  type PCMProcessorNode,
} from './utils/pcm-processor';

/**
 * Result returned by StreamingTTSModel.streamAudio, exposing the PCM
 * processor, audio context, analyser node, and a stop function.
 */
export interface StreamingAudioResult {
  /** PCM processor node feeding the analyser. */
  processorNode: PCMProcessorNode;
  /** Audio context driving playback. */
  audioContext: AudioContext;
  /** Analyser node for visualization (may be null). */
  analyserNode: AnalyserNode | null;
  /** Stop playback and release audio resources. */
  stop: () => void;
}

/**
 * Streaming TTS Service.
 * Handles streaming audio generation and PCM processor integration.
 * Initializes mobile support on construction and lazily creates the
 * AudioContext + PCM processor on first stream.
 */
export class StreamingTTSService {
  private audioContext: AudioContext | null = null;
  private processorNode: PCMProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isPlaying = false;
  private mobileInitialized = false;

  constructor() {
    // Initialize mobile support if needed
    if (isMobile() || isIOS()) {
      this.initializeMobileSupport();
    }
  }

  /**
   * Initialize mobile support (iOS requires user interaction).
   *
   * Pre-initializes the AudioContext and speech synthesis on first user
   * interaction to work around iOS autoplay restrictions.
   * @returns Nothing.
   */
  private initializeMobileSupport(): void {
    if (this.mobileInitialized) {
      return;
    }

    const handler = () => {
      if (this.mobileInitialized) {
        return;
      }

      // Pre-initialize AudioContext on user interaction
      if (!this.audioContext) {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }).webkitAudioContext;

        if (AudioContextClass) {
          this.audioContext = new AudioContextClass({ sampleRate: 24000 });
          this.audioContext.resume().catch(() => {
            // Ignore resume errors
          });
        }
      }

      // Enable speech synthesis (iOS workaround)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }

      this.mobileInitialized = true;
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };

    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
  }

  /**
   * Initialize the audio context and PCM processor.
   *
   * Creates an AudioContext at the given sample rate, resumes it if suspended
   * (browser autoplay policy), creates the PCM processor, and wires up an
   * analyser node for visualization.
   * @param sampleRate - AudioContext sample rate in Hz (default 24000).
   * @returns Nothing.
   * @throws When AudioContext is not supported.
   */
  public async initialize(sampleRate: number = 24000): Promise<void> {
    if (this.audioContext) {
      return;
    }

    // Ensure mobile support is initialized
    if ((isMobile() || isIOS()) && !this.mobileInitialized) {
      // Wait a bit for user interaction handler to fire
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('AudioContext is not supported in this browser');
    }

    this.audioContext = new AudioContextClass({ sampleRate });

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.processorNode = await createPCMProcessor(this.audioContext);

    // Create analyser node for visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.3;

    // Connect: processor -> analyser -> destination
    this.processorNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }

  /**
   * Stream TTS audio using the PCM processor.
   *
   * Consumes the model's streaming output, converts WAV chunks to PCM, and
   * feeds them to the processor node for real-time playback.
   * @param model - Streaming TTS model to consume.
   * @param options - TTS generation options.
   * @returns A {@link StreamingAudioResult} with nodes and a stop function.
   * @throws When the audio context fails to initialize.
   */
  public async streamAudio(
    model: StreamingTTSModel,
    options: TTSOptions
  ): Promise<StreamingAudioResult> {
    if (!this.audioContext || !this.processorNode) {
      await this.initialize();
    }

    if (!this.audioContext || !this.processorNode) {
      throw new Error('Failed to initialize audio context');
    }

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;

    // Stream audio chunks
    const stream = model.generateStream(options);
    const chunks: Uint8Array[] = [];

    try {
      for await (const chunk of stream) {
        if (!this.isPlaying) {
          break; // Stop if playback was stopped
        }

        chunks.push(chunk);

        // Convert WAV to PCM and stream to processor
        try {
          // Detect sample rate from WAV header
          const sampleRate = getWavSampleRate(chunk);
          const pcmData = convertWavToPCM(chunk);

          // Stream with sample rate information
          streamPCMToProcessor(this.processorNode!, pcmData, sampleRate);

          // Update AudioContext sample rate if different (requires recreation)
          if (this.audioContext && this.audioContext.sampleRate !== sampleRate) {
            console.warn(
              `Sample rate mismatch: AudioContext=${this.audioContext.sampleRate}Hz, Audio=${sampleRate}Hz`
            );
            // Note: AudioContext sample rate can't be changed after creation
            // Would need to recreate AudioContext, but that's disruptive
            // For now, rely on browser resampling
          }
        } catch (error) {
          console.warn('Failed to convert audio chunk:', error);
          // Continue with next chunk
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }

    return {
      processorNode: this.processorNode,
      audioContext: this.audioContext,
      analyserNode: this.analyserNode,
      stop: async () => {
        await this.stop();
      },
    };
  }

  /**
   * Set processor volume.
   *
   * Clamps to >= 0; values above 1.0 amplify.
   * @param volume - Volume level (0.0 to 1.0 nominal, can exceed for amplification).
   * @returns Nothing.
   */
  public setVolume(volume: number): void {
    if (this.processorNode) {
      setProcessorVolume(this.processorNode, volume);
    }
  }

  /**
   * Stop playback and release audio resources.
   *
   * Clears the processor buffer, disconnects nodes, and closes the
   * AudioContext.
   * @returns Nothing.
   */
  public async stop(): Promise<void> {
    this.isPlaying = false;

    // Clear buffer before disconnecting
    if (this.processorNode) {
      try {
        await clearProcessorBuffer(this.processorNode);
      } catch (error) {
        console.warn('Failed to clear processor buffer:', error);
      }

      try {
        this.processorNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {
        // Ignore close errors
      });
    }

    this.processorNode = null;
    this.audioContext = null;
    this.analyserNode = null;
  }

  /**
   * Get buffer status
   */
  public async getBufferStatus(): Promise<BufferStatus | null> {
    if (!this.processorNode) {
      return null;
    }

    try {
      return await getProcessorStatus(this.processorNode);
    } catch (error) {
      console.warn('Failed to get buffer status:', error);
      return null;
    }
  }

  /**
   * Check if currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current processor node (for visualization)
   */
  public getProcessorNode(): PCMProcessorNode | null {
    return this.processorNode;
  }

  /**
   * Get current audio context (for visualization)
   */
  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get current analyser node (for visualization)
   */
  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }
}

