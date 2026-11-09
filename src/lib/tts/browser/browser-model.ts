// Browser TTS Model (fallback)
// Uses native Web Speech API - doesn't support streaming, but provides fallback

import type { StreamingTTSModel, TTSOptions } from '../types';
import { isMobile } from '../utils/mobile-detection';

export interface BrowserVoice {
  name: string;
  voiceId: string;
  lang: string;
}

export const BROWSER_DEFAULT_VOICE_ID = '__browser_default__';
export const BROWSER_DEFAULT_VOICE_NAME = 'Browser Default Voice';

/**
 * Extended TTS options for browser TTS
 * Adds pitch support and chunking options
 */
export interface BrowserTTSOptions extends TTSOptions {
  pitch?: number;
  chunkLength?: number;
}

/**
 * Chunking settings for speechUtteranceChunker
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
 * Browser TTS Model
 * Uses native Web Speech API as fallback
 * Note: Browser TTS doesn't support streaming, so this is a compatibility layer
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
   * Browser TTS doesn't support true streaming
   * We simulate it by yielding the complete audio immediately
   */
  public async *generateStream(_options: TTSOptions): AsyncGenerator<Uint8Array> {
    // Browser TTS doesn't provide audio data directly
    // We can't stream it, so we yield an empty chunk as a signal
    // The actual playback happens via Web Speech API
    yield new Uint8Array(0);
  }

  /**
   * Browser TTS doesn't generate audio files
   * Returns empty array as placeholder
   */
  public async generateComplete(_options: TTSOptions): Promise<Uint8Array> {
    // Browser TTS doesn't provide audio data
    return new Uint8Array(0);
  }

  /**
   * Fetch available voices with fallback
   * Uses setTimeout pattern to handle async voice loading
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
   * Get voice by ID or name
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
   * Get raw SpeechSynthesisVoice objects
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
   * Initialize mobile support for iOS autoplay restrictions
   * Pre-initializes Speech Synthesis on first user interaction
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
   * Speak using Web Speech API directly
   * This is the actual implementation for browser TTS
   * Uses chunking for long texts to fix Chrome inconsistencies
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

