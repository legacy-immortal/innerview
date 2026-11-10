/**
 * @file browser-model.ts — Browser SpeechSynthesis TTS model (Web Speech API fallback).
 * @module lib/tts/browser/browser-model
 *
 * Browser TTS Model (fallback). Uses the native Web Speech API — it does not
 * support streaming, so it acts as a compatibility layer for the
 * StreamingTTSModel interface. Implements utterance chunking for long texts
 * to work around Chrome speech synthesis inconsistencies.
 */

import type { StreamingTTSModel, TTSOptions } from '../types';
import { isMobile } from '../utils/mobile-detection';

/**
 * Voice descriptor for the browser SpeechSynthesis provider.
 */
export interface BrowserVoice {
  /** Human-readable voice name. */
  name: string;
  /** Voice URI used to select the voice. */
  voiceId: string;
  /** Language tag (e.g. 'en-US'). */
  lang: string;
}

/** Sentinel voice id meaning "use the browser default voice". */
export const BROWSER_DEFAULT_VOICE_ID = '__browser_default__';

/** Display name for the browser default voice. */
export const BROWSER_DEFAULT_VOICE_NAME = 'Browser Default Voice';

/**
 * Extended TTS options for browser TTS.
 * Adds pitch support and chunking options on top of TTSOptions.
 */
export interface BrowserTTSOptions extends TTSOptions {
  /** Pitch multiplier (default 1.0). */
  pitch?: number;
  /** Max characters per utterance chunk for long-text chunking. */
  chunkLength?: number;
}

/**
 * Chunking settings for speechUtteranceChunker.
 */
interface ChunkSettings {
  chunkLength?: number;
  offset?: number;
  modifier?: (utterance: SpeechSynthesisUtterance) => void;
}

/**
 * Speech Utterance Chunker
 * Google Chrome Speech Synthesis Chunking Pattern
 * Fixes inconsistencies with speaking long texts in speechUtterance objects
 * Licensed under the MIT License
 * Peter Woolley and Brett Zamir
 * Modified by Haaris for bug fixes
 */
function speechUtteranceChunker(
  utterance: SpeechSynthesisUtterance,
  settings: ChunkSettings,
  callback?: () => void
): void {
  settings = settings || {};
  let newUtt: SpeechSynthesisUtterance;
  const txt =
    settings.offset !== undefined
      ? utterance.text.substring(settings.offset)
      : utterance.text;

  if (utterance.voice && utterance.voice.voiceURI === 'native') {
    // Not part of the spec
    newUtt = utterance;
    newUtt.text = txt;
    newUtt.addEventListener('end', function () {
      if ((speechUtteranceChunker as { cancel?: boolean }).cancel) {
        (speechUtteranceChunker as { cancel?: boolean }).cancel = false;
      }
      if (callback !== undefined) {
        callback();
      }
    });
  } else {
    const chunkLength = settings.chunkLength || 160;
    const pattRegex = new RegExp(
      '^[\\s\\S]{' +
        Math.floor(chunkLength / 2) +
        ',' +
        chunkLength +
        '}[.!?,]{1}|^[\\s\\S]{1,' +
        chunkLength +
        '}$|^[\\s\\S]{1,' +
        chunkLength +
        '} '
    );
    const chunkArr = txt.match(pattRegex);

    if (
      chunkArr == null ||
      chunkArr[0] === undefined ||
      chunkArr[0].length <= 2
    ) {
      // Call once all text has been spoken...
      if (callback !== undefined) {
        callback();
      }
      return;
    }

    const chunk = chunkArr[0];
    newUtt = new SpeechSynthesisUtterance(chunk);

    // Explicitly set important properties from original utterance
    newUtt.lang = utterance.lang;
    newUtt.voice = utterance.voice;
    newUtt.rate = utterance.rate;
    newUtt.pitch = utterance.pitch;
    newUtt.volume = utterance.volume;

    newUtt.addEventListener('end', function () {
      if ((speechUtteranceChunker as { cancel?: boolean }).cancel) {
        (speechUtteranceChunker as { cancel?: boolean }).cancel = false;
        return;
      }
      settings.offset = settings.offset || 0;
      settings.offset += chunk.length;
      speechUtteranceChunker(utterance, settings, callback);
    });
  }

  if (settings.modifier) {
    settings.modifier(newUtt);
  }

  // IMPORTANT: Logging the object fixes some onend firing issues in Chrome
  console.log(newUtt);

  // Placing the speak invocation inside a callback fixes ordering and onend issues
  setTimeout(function () {
    window.speechSynthesis.speak(newUtt);
  }, 0);
}

/**
 * Browser TTS Model.
 * Uses native Web Speech API as fallback. Browser TTS does not support
 * streaming, so this is a compatibility layer implementing
 * StreamingTTSModel: generateStream yields an empty chunk while playback
 * happens directly through the Web Speech API in `speak()`.
 */
export class BrowserTTSModel implements StreamingTTSModel {
  readonly modelId = 'speech-synthesis';
  readonly provider = 'browser';
  private voicesCache: BrowserVoice[] | null = null;
  private mobileInitialized = false;

  constructor() {
    this.initializeMobileSupport();
  }

  /**
   * Browser TTS doesn't support true streaming.
   *
   * Simulates streaming by yielding a single empty chunk; playback happens
   * via {@link speak} through the Web Speech API.
   * @param options - TTS options (unused by the browser provider).
   * @yields One empty Uint8Array chunk as a signal.
   */
  public async *generateStream(_options: TTSOptions): AsyncGenerator<Uint8Array> {
    // Browser TTS doesn't provide audio data directly
    // We can't stream it, so we yield an empty chunk as a signal
    // The actual playback happens via Web Speech API
    yield new Uint8Array(0);
  }

  /**
   * Browser TTS doesn't generate audio files.
   *
   * Returns an empty Uint8Array as a placeholder.
   * @param options - TTS options (unused by the browser provider).
   * @returns An empty Uint8Array.
   */
  public async generateComplete(_options: TTSOptions): Promise<Uint8Array> {
    // Browser TTS doesn't provide audio data
    return new Uint8Array(0);
  }

  /**
   * Fetch available browser voices with a fallback default voice.
   *
   * Caches the result; uses a setTimeout to handle asynchronous voice loading
   * in browsers that populate voices after startup.
   * @returns A list of {@link BrowserVoice} objects.
   */
  public async fetchVoices(): Promise<BrowserVoice[]> {
    if (this.voicesCache) {
      return this.voicesCache;
    }

    if (!('speechSynthesis' in window)) {
      return [
        {
          name: BROWSER_DEFAULT_VOICE_NAME,
          voiceId: BROWSER_DEFAULT_VOICE_ID,
          lang: navigator.language || 'en-US',
        },
      ];
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        const voices = window.speechSynthesis.getVoices();

        if (voices.length === 0) {
          // Fallback: provide default voice when list is empty
          const defaultVoice: BrowserVoice = {
            name: BROWSER_DEFAULT_VOICE_NAME,
            voiceId: BROWSER_DEFAULT_VOICE_ID,
            lang: navigator.language || 'en-US',
          };
          this.voicesCache = [defaultVoice];
          resolve([defaultVoice]);
        } else {
          // Map and sort voices
          const mappedVoices: BrowserVoice[] = voices
            .map((v) => ({
              name: v.name,
              voiceId: v.voiceURI,
              lang: v.lang,
            }))
            .sort(
              (a, b) =>
                a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)
            );
          this.voicesCache = mappedVoices;
          resolve(mappedVoices);
        }
      }, 50);
    });
  }

  /**
   * Get a SpeechSynthesisVoice by id or name.
   * @param voiceId - Voice URI or name to match, or the default voice id.
   * @returns The matching voice, or null for the browser default / not found.
   */
  private async getVoiceById(voiceId?: string): Promise<SpeechSynthesisVoice | null> {
    if (!voiceId || voiceId === BROWSER_DEFAULT_VOICE_ID) {
      return null; // Use browser default
    }

    const voices = await this.getVoices();
    return (
      voices.find((v) => v.voiceURI === voiceId) ||
      voices.find((v) => v.name === voiceId) ||
      null
    );
  }

  /**
   * Get raw SpeechSynthesisVoice objects.
   * @returns The browser's available voices, or an empty array.
   */
  private async getVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!('speechSynthesis' in window)) {
      return [];
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        const voices = window.speechSynthesis.getVoices();
        resolve(voices.length > 0 ? voices : []);
      }, 50);
    });
  }

  /**
   * Initialize mobile support for iOS autoplay restrictions.
   *
   * Pre-initializes Speech Synthesis with a silent utterance on first user
   * interaction so subsequent speech plays without a gesture.
   * @returns Nothing.
   */
  private initializeMobileSupport(): void {
    if (!isMobile() || this.mobileInitialized) {
      return;
    }

    const handler = () => {
      if (this.mobileInitialized) {
        return;
      }

      // Pre-initialize Speech Synthesis API with silent utterance
      const utterance = new SpeechSynthesisUtterance(' . ');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
      this.mobileInitialized = true;

      // Remove listeners after initialization
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };

    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
  }

  /**
   * Speak text using the Web Speech API directly.
   *
   * This is the actual implementation for browser TTS. Uses chunking for long
   * texts to fix Chrome inconsistencies with long utterances.
   * @param options - Browser TTS options (text, voice, speed, pitch, chunkLength).
   * @returns The spoken {@link SpeechSynthesisUtterance}.
   */
  async speak(
    options: BrowserTTSOptions
  ): Promise<SpeechSynthesisUtterance> {
    const utterance = new SpeechSynthesisUtterance(options.text);

    // Get voice asynchronously
    const voice = await this.getVoiceById(options.voice);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = options.speed || 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    // Add error handling
    utterance.onerror = (event) => {
      console.error('Browser TTS error:', event.error, event);
    };

    // Use chunking for long texts (Chrome fix)
    const chunkLength = options.chunkLength || 200;
    if (options.text.length > chunkLength) {
      return new Promise<SpeechSynthesisUtterance>((resolve, reject) => {
        speechUtteranceChunker(
          utterance,
          {
            chunkLength,
          },
          () => {
            resolve(utterance);
          }
        );

        // Reject on error
        utterance.onerror = (event) => {
          console.error('Browser TTS chunking error:', event.error, event);
          reject(new Error(`TTS error: ${event.error}`));
        };
      });
    }

    // IMPORTANT: Logging the object fixes some onend firing issues in Chrome
    console.log(utterance);

    // Use setTimeout pattern to fix ordering and onend firing issues
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 0);

    return utterance;
  }
}

