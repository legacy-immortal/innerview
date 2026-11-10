/**
 * @file kokoro-worker.ts — Web Worker that runs Kokoro TTS generation off the main thread.
 * @module lib/tts/kokoro/kokoro-worker
 *
 * Kokoro TTS Web Worker. Handles TTS generation in a separate thread to avoid
 * blocking the main thread. Communicates with the main thread via postMessage
 * for initialization and per-chunk generation, returning blob URLs for audio.
 */

/**
 * Kokoro TTS Web Worker entry point.
 * Handles TTS generation in a separate thread to avoid blocking the main thread.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Kokoro TTS instance interface
 * Matches the structure from kokoro-js npm package
 */
interface KokoroTTS {
  generate(
    text: string,
    options?: { voice?: string; speed?: number }
  ): Promise<{ toBlob: () => Blob }>;
  voices: Record<string, unknown>;
}

interface InitializeSettings {
  modelId: string;
  dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
  device?: 'wasm' | 'webgpu' | 'cpu' | null;
}

interface GenerateTtsData {
  text: string;
  voice?: string;
  speakingRate?: number;
  requestId?: number;
}

interface WorkerMessage {
  action: string;
  data?: unknown;
}

interface InitializeResponse {
  action: 'initialized';
  success: boolean;
  voices?: string[];
  error?: string;
}

interface GenerateTtsResponse {
  action: 'generatedTts';
  success: boolean;
  blobUrl?: string;
  requestId?: number;
  error?: string;
}

interface ReadyStatusResponse {
  action: 'readyStatus';
  ready: boolean;
}

interface ErrorResponse {
  action: 'error';
  success: false;
  error: string;
}


// ============================================================================
// Constants
// ============================================================================

const WORKER_ACTIONS = {
  INITIALIZE: 'initialize',
  GENERATE_TTS: 'generateTts',
  CHECK_READY: 'checkReady',
} as const;

const RESPONSE_ACTIONS = {
  INITIALIZED: 'initialized',
  GENERATED_TTS: 'generatedTts',
  READY_STATUS: 'readyStatus',
} as const;

const DEFAULT_SPEAKING_RATE = 1.0;

// ============================================================================
// State
// ============================================================================

let tts: KokoroTTS | null = null;
let ready = false;
let voices: string[] = [];

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Handle messages from the main thread
 */
self.onmessage = async function (
  event: MessageEvent<WorkerMessage>
): Promise<void> {
  const { action, data } = event.data;

  try {
    switch (action) {
      case WORKER_ACTIONS.INITIALIZE:
        await handleInitialize(data);
        break;

      case WORKER_ACTIONS.GENERATE_TTS:
        await handleGenerateTts(data);
        break;

      case WORKER_ACTIONS.CHECK_READY:
        handleCheckReady();
        break;

      default:
        sendError(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    sendError(errorMessage);
  }
};

/**
 * Handle initialization request
 */
async function handleInitialize(settings: unknown): Promise<void> {
  try {
    if (!isInitializeSettings(settings)) {
      throw new Error('Invalid initialization settings');
    }

    const result = await initializeTts(settings);

    const response: InitializeResponse = {
      action: RESPONSE_ACTIONS.INITIALIZED,
      success: result,
      voices,
    };

    self.postMessage(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Initialization failed';

    console.error('Worker: Initialization failed:', errorMessage);

    const response: InitializeResponse = {
      action: RESPONSE_ACTIONS.INITIALIZED,
      success: false,
      error: errorMessage,
    };

    self.postMessage(response);
  }
}

/**
 * Handle TTS generation request
 */
async function handleGenerateTts(data: unknown): Promise<void> {
  try {
    if (!isGenerateTtsData(data)) {
      throw new Error('Invalid TTS generation data');
    }

    const { text, voice, speakingRate, requestId } = data;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Empty or invalid text');
    }

    const audioBlob = await generateTts(
      text,
      voice,
      speakingRate ?? DEFAULT_SPEAKING_RATE
    );

    const blobUrl = URL.createObjectURL(audioBlob);

    const response: GenerateTtsResponse = {
      action: RESPONSE_ACTIONS.GENERATED_TTS,
      success: true,
      blobUrl,
      requestId,
    };

    self.postMessage(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'TTS generation failed';

    console.error('Worker: TTS generation failed:', errorMessage);

    const response: GenerateTtsResponse = {
      action: RESPONSE_ACTIONS.GENERATED_TTS,
      success: false,
      error: errorMessage,
      requestId: isGenerateTtsData(data) ? data.requestId : undefined,
    };

    self.postMessage(response);
  }
}

/**
 * Handle ready status check
 */
function handleCheckReady(): void {
  const response: ReadyStatusResponse = {
    action: RESPONSE_ACTIONS.READY_STATUS,
    ready,
  };

  self.postMessage(response);
}

/**
 * Send error response
 */
function sendError(error: string): void {
  const response: ErrorResponse = {
    action: 'error',
    success: false,
    error,
  };

  self.postMessage(response);
}

// ============================================================================
// TTS Functions
// ============================================================================

/**
 * Initialize the TTS engine
 */
async function initializeTts(settings: InitializeSettings): Promise<boolean> {
  try {
    // Import Kokoro TTS library from official npm package
    const { KokoroTTS } = await import('kokoro-js');

    console.log('Worker: Initializing Kokoro TTS with settings:', {
      modelId: settings.modelId,
      dtype: settings.dtype,
      device: settings.device,
    });

    // Create TTS instance using static method
    tts = await KokoroTTS.from_pretrained(settings.modelId, {
      dtype: settings.dtype as 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' | undefined,
      device: (settings.device as 'wasm' | 'webgpu' | 'cpu' | null) ?? 'wasm',
    });

    // Validate TTS instance
    if (!tts) {
      throw new Error('Failed to create TTS instance');
    }

    if (typeof tts.generate !== 'function') {
      throw new Error('TTS instance does not have generate method');
    }

    // Get available voices
    if (tts.voices && typeof tts.voices === 'object') {
      voices = Object.keys(tts.voices);
    } else {
      voices = [];
      console.warn('Worker: No voices found in TTS instance');
    }

    console.log('Worker: TTS initialized successfully', {
      voiceCount: voices.length,
    });

    ready = true;
    return true;
  } catch (error) {
    console.error('Worker: Kokoro TTS initialization failed:', error);
    ready = false;
    tts = null;
    voices = [];
    throw error;
  }
}

/**
 * Generate TTS audio
 */
async function generateTts(
  text: string,
  voiceId: string | undefined,
  speakingRate: number
): Promise<Blob> {
  if (!ready || !tts) {
    throw new Error('TTS engine not initialized');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Empty or invalid text');
  }

  if (typeof speakingRate !== 'number' || speakingRate <= 0) {
    throw new Error('Invalid speaking rate');
  }

  try {
    const audio = await tts.generate(text, {
      voice: voiceId,
      speed: speakingRate,
    });

    if (!audio || typeof audio.toBlob !== 'function') {
      throw new Error('Invalid audio object returned from TTS');
    }

    return audio.toBlob();
  } catch (error) {
    console.error('Worker: TTS generation failed:', error);
    throw error;
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for initialization settings
 */
function isInitializeSettings(
  settings: unknown
): settings is InitializeSettings {
  return (
    typeof settings === 'object' &&
    settings !== null &&
    'modelId' in settings &&
    typeof (settings as InitializeSettings).modelId === 'string'
  );
}

/**
 * Type guard for TTS generation data
 */
function isGenerateTtsData(data: unknown): data is GenerateTtsData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'text' in data &&
    typeof (data as GenerateTtsData).text === 'string'
  );
}

