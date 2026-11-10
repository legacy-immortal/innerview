/**
 * @file tts-service.ts — Top-level TTS service selecting a provider model and owning playback lifecycle.
 * @module lib/tts/tts-service
 *
 * Streaming-first TTS Service. Selects the Kokoro or browser provider model,
 * owns the playback lifecycle (speak/stop), and exposes audio nodes for
 * visualization. Falls back to browser speech synthesis when streaming
 * generation fails.
 */
import type { StreamingTTSModel, TTSOptions } from './types';
import { isStreamingModel } from './types';
import { KokoroTTSModel } from './kokoro/kokoro-model';
import { BrowserTTSModel } from './browser/browser-model';
import { StreamingTTSService } from './streaming-service';
import { useSettingsStore } from '../settings-store';

/**
 * Handle returned by TTSService.speak, exposing playback controls and audio
 * nodes. Backward-compatible with visualization components that expect an
 * HTMLAudioElement-like object.
 */
export interface TTSResult {
  /** Stop playback. */
  stop: () => void;
  /** Set volume (0.0 to 1.0, can exceed 1 for amplification). */
  setVolume: (volume: number) => void;
  /** Get the PCM processor node for visualization. */
  getProcessorNode: () => AudioWorkletNode | null;
  /** Get the audio context. */
  getAudioContext: () => AudioContext | null;
  /** Get the analyser node for visualization. */
  getAnalyserNode: () => AnalyserNode | null;
  /** Backward-compatible mock HTMLAudioElement-like object for browser TTS. */
  getAudioElement?: () => HTMLAudioElement | null;
}

/**
 * Streaming-first TTS Service.
 * Uses PCM processor for real-time audio streaming. Selects the Kokoro or
 * browser provider model based on settings/options and owns the playback
 * lifecycle.
 */
export class TTSService {
  private streamingService: StreamingTTSService;
  private currentResult: TTSResult | null = null;

  constructor() {
    this.streamingService = new StreamingTTSService();
  }

  /**
   * Speak text using streaming TTS.
   *
   * Stops any currently playing audio, resolves the provider from options or
   * settings, and streams via {@link StreamingTTSService}. Falls back to
   * browser speech synthesis on error.
   * @param text - Text to speak.
   * @param options - TTS options (provider, voice, speed).
   * @returns A {@link TTSResult} with stop, setVolume, and node accessors.
   * @throws When no model is available for the provider.
   */
  public async speak(
    text: string,
    options: Omit<TTSOptions, 'text'> = {}
  ): Promise<TTSResult> {
    // Stop any currently playing audio
    this.stop();

    // Get settings from store
    const ttsSettings = useSettingsStore.getState().getTTSSettings();
    const rawProvider =
      (typeof options.provider === 'string' &&
        (options.provider === 'kokoro' || options.provider === 'browser')
        ? options.provider
        : undefined) ||
      (ttsSettings?.provider === 'kokoro' || ttsSettings?.provider === 'browser'
        ? ttsSettings.provider
        : undefined) ||
      'kokoro';
    const provider: 'kokoro' | 'browser' = rawProvider;

    // Get provider-specific defaults
    const getVoice = (): string | undefined => {
      if (options.voice && typeof options.voice === 'string') {
        return options.voice;
      }
      if (provider === 'kokoro' && ttsSettings?.kokoro?.defaultVoice) {
        return ttsSettings.kokoro.defaultVoice;
      }
      if (provider === 'browser' && ttsSettings?.browser?.defaultVoice) {
        return ttsSettings.browser.defaultVoice;
      }
      return provider === 'kokoro' ? 'af_heart' : undefined;
    };

    const getSpeed = (): number => {
      if (typeof options.speed === 'number') {
        return options.speed;
      }
      if (provider === 'kokoro' && typeof ttsSettings?.kokoro?.speakingRate === 'number') {
        return ttsSettings.kokoro.speakingRate;
      }
      if (provider === 'browser' && typeof ttsSettings?.browser?.rate === 'number') {
        return ttsSettings.browser.rate;
      }
      return 1.0;
    };

    try {
      // Get model for provider
      const model = this.getModel(provider, ttsSettings);

      if (!model) {
        throw new Error(`Unknown TTS provider: ${provider}`);
      }


      // Handle browser TTS separately (doesn't provide audio data)
      if (provider === 'browser') {
        return await this.fallbackToBrowserSpeech(text, getSpeed(), getVoice());
      }

      // All models support streaming (streaming-first architecture)
      if (!isStreamingModel(model)) {
        throw new Error(`Provider ${provider} does not support streaming`);
      }

      // Use streaming (default and only method)
      const result = await this.streamingService.streamAudio(model, {
        text,
        voice: getVoice(),
        speed: getSpeed(),
      });

      this.currentResult = {
        stop: async () => {
          await result.stop();
          this.currentResult = null;
        },
        setVolume: (volume: number) => {
          this.streamingService.setVolume(volume);
        },
        getProcessorNode: () => result.processorNode,
        getAudioContext: () => result.audioContext,
        getAnalyserNode: () => result.analyserNode,
      };

      return this.currentResult;
    } catch (error) {
      console.error(`TTS failed for provider ${provider}:`, error);

      // Final fallback: browser speech synthesis
      return this.fallbackToBrowserSpeech(text, getSpeed());
    }
  }

  /**
   * Fallback to browser speech synthesis.
   *
   * Used when the selected provider fails or is the browser provider itself.
   * @param text - Text to speak.
   * @param speed - Speaking rate multiplier.
   * @param voice - Optional voice id.
   * @returns A {@link TTSResult} wired to the browser synth.
   */
  private async fallbackToBrowserSpeech(
    text: string,
    speed: number,
    voice?: string
  ): Promise<TTSResult> {
    const model = this.getModel('browser', useSettingsStore.getState().getTTSSettings());

    if (model instanceof BrowserTTSModel) {
      const utterance = await model.speak({
        text,
        speed,
        voice,
      });

      const synth = window.speechSynthesis;

      return {
        stop: () => {
          synth.cancel();
          this.currentResult = null;
        },
        setVolume: (volume: number) => {
          utterance.volume = Math.max(0, Math.min(1, volume));
        },
        getProcessorNode: () => null,
        getAudioContext: () => null,
        getAnalyserNode: () => null,
      };
    }

    // Fallback fallback - direct synthesis
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;

    const synth = window.speechSynthesis;

    // Use setTimeout pattern for better event handling
    setTimeout(() => {
      synth.speak(utterance);
    }, 0);

    return {
      stop: () => {
        synth.cancel();
        this.currentResult = null;
      },
      setVolume: (volume: number) => {
        utterance.volume = Math.max(0, Math.min(1, volume));
      },
      getProcessorNode: () => null,
      getAudioContext: () => null,
      getAnalyserNode: () => null,
    };
  }

  /**
   * Get the streaming model for a provider.
   *
   * Constructs a KokoroTTSModel or BrowserTTSModel based on provider and
   * settings. Returns null for unknown providers.
   * @param provider - 'kokoro' or 'browser'.
   * @param ttsSettings - Current TTS settings from the store, or null.
   * @returns A {@link StreamingTTSModel}, or null for unknown providers.
   */
  private getModel(
    provider: string,
    ttsSettings: ReturnType<ReturnType<typeof useSettingsStore.getState>['getTTSSettings']> | null
  ): StreamingTTSModel | null {
    switch (provider) {
      case 'kokoro': {
        const modelId = ttsSettings?.kokoro?.modelId || 'Kokoro-82M-v1.0-ONNX';
        return new KokoroTTSModel(modelId, {
          modelId: ttsSettings?.kokoro?.modelId,
          dtype: ttsSettings?.kokoro?.dtype as 'q8' | 'q4' | undefined,
          device: ttsSettings?.kokoro?.device as 'wasm' | 'cpu' | 'gpu' | undefined,
          defaultVoice: ttsSettings?.kokoro?.defaultVoice,
        });
      }

      case 'browser':
        return new BrowserTTSModel();

      default:
        return null;
    }
  }

  /**
   * Stop current playback.
   *
   * Stops the current result and the streaming service, and cancels browser
   * speech synthesis.
   * @returns Nothing.
   */
  public async stop(): Promise<void> {
    if (this.currentResult) {
      await this.currentResult.stop();
    }
    await this.streamingService.stop();
    this.currentResult = null;

    // Also cancel browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Get the current audio context (for visualization).
   * @returns The AudioContext, or null when not initialized.
   */
  public getAudioContext(): AudioContext | null {
    return this.streamingService.getAudioContext();
  }

  /**
   * Get the current processor node (for visualization).
   * @returns The PCMProcessorNode, or null when not initialized.
   */
  public getProcessorNode(): AudioWorkletNode | null {
    return this.streamingService.getProcessorNode();
  }

  /**
   * Get the current analyser node (for visualization).
   * @returns The AnalyserNode, or null when not initialized.
   */
  public getAnalyserNode(): AnalyserNode | null {
    return this.streamingService.getAnalyserNode();
  }

  /**
   * Check whether audio is currently playing.
   * @returns true when playback is active.
   */
  public isPlaying(): boolean {
    return this.streamingService.getIsPlaying();
  }
}

// Singleton instance
export const ttsService = new TTSService();
