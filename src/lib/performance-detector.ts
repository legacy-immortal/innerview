/**
 * @file Device capability detection and performance tier resolution.
 * @module lib/performance-detector.ts
 */
// Performance detection and resource management
// Detects device capabilities and adjusts app features accordingly

export type PerformanceTier = 'low' | 'medium' | 'high';

export interface PerformanceMetrics {
  tier: PerformanceTier;
  score: number; // 0-100
  hardwareConcurrency: number;
  deviceMemory?: number; // GB (if available)
  gpuTier?: 'low' | 'medium' | 'high';
  frameRate: number; // FPS estimate
  supportsWebGL2: boolean;
  supportsWebGPU: boolean;
  // TTS capabilities
  supportsSpeechSynthesis: boolean;
  availableVoices: number;
  // Transcription capabilities
  supportsMediaRecorder: boolean;
  supportsGetUserMedia: boolean;
  supportsLocalTranscription: boolean;
  /** Whether the microphone is actually usable (permission not denied). */
  supportsMicrophone: boolean;
}

export interface PerformanceSettings {
  animationsEnabled: boolean;
  backgroundAnimationsEnabled: boolean;
  reducedMotion: boolean;
  lowPowerMode: boolean;
  maxParticles: number;
  maxBackgroundComplexity: 'minimal' | 'simple' | 'normal' | 'full';
  chakraAnimationsEnabled: boolean;
  virtualScrollingEnabled: boolean;
}

// Detect GPU tier using WebGL
function detectGPUTier(): 'low' | 'medium' | 'high' {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) return 'low';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'medium';

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

    // Check for integrated graphics (lower tier)
    const isIntegrated =
      renderer.toLowerCase().includes('intel') ||
      renderer.toLowerCase().includes('integrated') ||
      renderer.toLowerCase().includes('mali') ||
      renderer.toLowerCase().includes('adreno') ||
      vendor.toLowerCase().includes('intel');

    // Check for high-end GPUs
    const isHighEnd =
      renderer.toLowerCase().includes('nvidia') ||
      renderer.toLowerCase().includes('rtx') ||
      renderer.toLowerCase().includes('gtx') ||
      renderer.toLowerCase().includes('radeon') ||
      renderer.toLowerCase().includes('rx ');

    if (isHighEnd && !isIntegrated) return 'high';
    if (isIntegrated) return 'low';
    return 'medium';
  } catch {
    return 'low';
  }
}

// Measure frame rate using requestAnimationFrame. Times out so detection
// never hangs in headless/backgrounded/throttled contexts where rAF may
// be paused or severely delayed.
async function measureFrameRate(duration = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let settled = false;
    const startTime = performance.now();
    let rafId = 0;
    const fallbackFps = 30;

    const finish = (fps: number): void => {
      if (settled) return;
      settled = true;
      if (rafId) cancelAnimationFrame(rafId);
      resolve(fps);
    };

    function countFrame(): void {
      if (settled) return;
      frames++;
      const currentTime = performance.now();

      if (currentTime - startTime >= duration) {
        const elapsed = currentTime - startTime;
        const fps =
          elapsed > 0 ? Math.round((frames * 1000) / elapsed) : fallbackFps;
        finish(fps);
        return;
      }

      rafId = requestAnimationFrame(countFrame);
    }

    // Hard timeout: rAF can stall in headless/background tabs. Resolve with
    // a conservative estimate rather than hanging bootstrap forever.
    window.setTimeout(() => {
      if (settled) return;
      const elapsed = performance.now() - startTime;
      const fps =
        frames > 0 && elapsed > 0
          ? Math.round((frames * 1000) / elapsed)
          : fallbackFps;
      finish(fps);
    }, duration + 1500);

    rafId = requestAnimationFrame(countFrame);
  });
}

// Check for reduced motion preference
function checkReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Calculate performance score (0-100)
function calculateScore(
  metrics: Omit<PerformanceMetrics, 'score' | 'tier'>
): number {
  let score = 50; // Base score

  // Hardware concurrency (CPU cores)
  if (metrics.hardwareConcurrency >= 8) score += 20;
  else if (metrics.hardwareConcurrency >= 4) score += 10;
  else if (metrics.hardwareConcurrency >= 2) score += 5;

  // Device memory
  if (metrics.deviceMemory) {
    if (metrics.deviceMemory >= 8) score += 20;
    else if (metrics.deviceMemory >= 4) score += 10;
    else if (metrics.deviceMemory >= 2) score += 5;
  }

  // GPU tier
  if (metrics.gpuTier === 'high') score += 20;
  else if (metrics.gpuTier === 'medium') score += 10;
  else if (metrics.gpuTier === 'low') score -= 10;

  // Frame rate
  if (metrics.frameRate >= 55) score += 10;
  else if (metrics.frameRate >= 30) score += 5;
  else if (metrics.frameRate < 20) score -= 15;

  // WebGL2 support
  if (metrics.supportsWebGL2) score += 5;

  // WebGPU support (future-proofing)
  if (metrics.supportsWebGPU) score += 10;

  return Math.max(0, Math.min(100, score));
}

// Determine performance tier from score
function getTier(score: number): PerformanceTier {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// Detect TTS capabilities
function detectTTSCapabilities(): {
  supportsSpeechSynthesis: boolean;
  availableVoices: number;
} {
  const supportsSpeechSynthesis = 'speechSynthesis' in window;
  let availableVoices = 0;

  if (supportsSpeechSynthesis) {
    // Get voices synchronously first
    const voices = window.speechSynthesis.getVoices();
    availableVoices = voices.length;

    // If no voices available yet, wait for them to load
    if (availableVoices === 0) {
      // Return 0 for now, but note that voices may load asynchronously
      // The actual count will be available after onvoiceschanged fires
    }
  }

  return {
    supportsSpeechSynthesis,
    availableVoices,
  };
}

// Detect transcription capabilities
function detectTranscriptionCapabilities(): {
  supportsMediaRecorder: boolean;
  supportsGetUserMedia: boolean;
  supportsLocalTranscription: boolean;
} {
  const supportsMediaRecorder =
    typeof MediaRecorder !== 'undefined' &&
    MediaRecorder.isTypeSupported !== undefined;

  const supportsGetUserMedia =
    typeof navigator !== 'undefined' &&
    (navigator.mediaDevices?.getUserMedia !== undefined ||
      (navigator as { getUserMedia?: unknown }).getUserMedia !== undefined);

  // Check if local transcription is supported (browser-based)
  // This checks for WebAssembly support which is needed for Transformers.js
  const supportsLocalTranscription =
    typeof WebAssembly !== 'undefined' &&
    typeof fetch !== 'undefined' &&
    typeof ArrayBuffer !== 'undefined';

  return {
    supportsMediaRecorder,
    supportsGetUserMedia,
    supportsLocalTranscription,
  };
}

/**
 * Detect whether the microphone is actually usable.
 * Checks the Permission API state first (a 'denied' state means the user has
 * explicitly blocked mic access and no model preload is worthwhile), then
 * falls back to getUserMedia API existence.
 * @returns True when the microphone appears available for recording.
 */
async function detectMicrophoneCapability(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  // API must exist at all.
  const hasApi =
    navigator.mediaDevices?.getUserMedia !== undefined ||
    (navigator as { getUserMedia?: unknown }).getUserMedia !== undefined;
  if (!hasApi) return false;
  // Query the permission state if the browser supports it.
  try {
    if (navigator.permissions) {
      return navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((result) => result.state !== 'denied')
        .catch(() => true); // On query failure, assume usable (API exists)
    }
  } catch {
    // Permissions API not fully supported; fall through to API-existence check.
  }
  return true;
}

type PermissionName = 'microphone';

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const tid = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, ms);
    promise.then(
      (v) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(tid);
        resolve(v);
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(tid);
        resolve(fallback);
      }
    );
  });
}

// Detect performance metrics
export async function detectPerformance(): Promise<PerformanceMetrics> {
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;

  let supportsWebGL2 = false;
  let supportsWebGPU = false;
  let gpuTier: 'low' | 'medium' | 'high' = 'medium';
  try {
    supportsWebGL2 = !!document.createElement('canvas').getContext('webgl2');
  } catch {
    supportsWebGL2 = false;
  }
  try {
    supportsWebGPU = !!(navigator.gpu || (window as { gpu?: unknown }).gpu);
  } catch {
    supportsWebGPU = false;
  }
  try {
    gpuTier = detectGPUTier();
  } catch {
    gpuTier = 'medium';
  }

  // measureFrameRate has its own hard timeout; wrap again as a safety net.
  const frameRate = await withTimeout(measureFrameRate(500), 4000, 30);

  // Detect TTS capabilities
  const ttsCapabilities = detectTTSCapabilities();

  // Wait briefly for voices to load if speech synthesis is supported.
  // Uses addEventListener to avoid clobbering global handlers; always
  // resolves within the timeout so detection cannot hang.
  if (
    ttsCapabilities.supportsSpeechSynthesis &&
    ttsCapabilities.availableVoices === 0
  ) {
    await new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }
      if (window.speechSynthesis.getVoices().length > 0) {
        resolve();
        return;
      }
      let settled = false;
      const done = (): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        try {
          window.speechSynthesis.removeEventListener('voiceschanged', done);
        } catch {
          // ignore
        }
        resolve();
      };
      const timeoutId = window.setTimeout(done, 500);
      try {
        window.speechSynthesis.addEventListener('voiceschanged', done);
      } catch {
        done();
      }
    });
    try {
      ttsCapabilities.availableVoices =
        window.speechSynthesis.getVoices().length;
    } catch {
      // keep default
    }
  }

  // Detect transcription capabilities
  let transcriptionCapabilities = {
    supportsMediaRecorder: false,
    supportsGetUserMedia: false,
    supportsLocalTranscription: false,
  };
  try {
    transcriptionCapabilities = detectTranscriptionCapabilities();
  } catch {
    // keep defaults
  }

  // Detect microphone usability (permission state). Awaits the Permissions API
  // so the result reflects real user-grant/deny state, not just API presence.
  let supportsMicrophone = false;
  try {
    supportsMicrophone = await detectMicrophoneCapability();
  } catch {
    // keep default (false)
  }

  const metrics: Omit<PerformanceMetrics, 'score' | 'tier'> = {
    hardwareConcurrency,
    deviceMemory,
    gpuTier,
    frameRate,
    supportsWebGL2,
    supportsWebGPU,
    ...ttsCapabilities,
    ...transcriptionCapabilities,
    supportsMicrophone,
  };

  const score = calculateScore(metrics);
  const tier = getTier(score);

  return {
    ...metrics,
    score,
    tier,
  };
}

// Generate performance settings based on metrics
export function generatePerformanceSettings(
  metrics: PerformanceMetrics,
  userOverrides?: Partial<PerformanceSettings>
): PerformanceSettings {
  const { tier, frameRate } = metrics;
  const reducedMotion = checkReducedMotion();

  // Base settings based on tier
  let settings: PerformanceSettings;

  if (tier === 'low' || reducedMotion || frameRate < 25) {
    // Low performance mode
    settings = {
      animationsEnabled: false,
      backgroundAnimationsEnabled: false,
      reducedMotion: true,
      lowPowerMode: true,
      maxParticles: 0,
      maxBackgroundComplexity: 'minimal',
      chakraAnimationsEnabled: false,
      virtualScrollingEnabled: true, // Keep virtual scrolling for performance
    };
  } else if (tier === 'medium' || frameRate < 45) {
    // Medium performance mode
    settings = {
      animationsEnabled: true,
      backgroundAnimationsEnabled: true,
      reducedMotion: false,
      lowPowerMode: false,
      maxParticles: 25,
      maxBackgroundComplexity: 'simple',
      chakraAnimationsEnabled: true,
      virtualScrollingEnabled: true,
    };
  } else {
    // High performance mode
    settings = {
      animationsEnabled: true,
      backgroundAnimationsEnabled: true,
      reducedMotion: false,
      lowPowerMode: false,
      maxParticles: 100,
      maxBackgroundComplexity: 'full',
      chakraAnimationsEnabled: true,
      virtualScrollingEnabled: true,
    };
  }

  // Apply user overrides
  if (userOverrides) {
    settings = { ...settings, ...userOverrides };
  }

  return settings;
}

// Settings for a specific tier (used by disclaimer and settings modal)
export type PerformanceSettingsWithTier = PerformanceSettings & {
  tier: PerformanceTier;
  autoDetected: false;
};

export function getPerformanceSettingsForTier(
  metrics: PerformanceMetrics,
  tier: PerformanceTier
): PerformanceSettingsWithTier {
  const base = generatePerformanceSettings(metrics);
  if (tier === 'low') {
    return {
      ...base,
      animationsEnabled: false,
      backgroundAnimationsEnabled: false,
      reducedMotion: true,
      lowPowerMode: true,
      maxParticles: 0,
      maxBackgroundComplexity: 'minimal',
      chakraAnimationsEnabled: false,
      tier: 'low',
      autoDetected: false,
    };
  }
  if (tier === 'medium') {
    return {
      ...base,
      animationsEnabled: true,
      backgroundAnimationsEnabled: true,
      reducedMotion: false,
      lowPowerMode: false,
      maxParticles: 25,
      maxBackgroundComplexity: 'simple',
      chakraAnimationsEnabled: true,
      tier: 'medium',
      autoDetected: false,
    };
  }
  return {
    ...base,
    animationsEnabled: true,
    backgroundAnimationsEnabled: true,
    reducedMotion: false,
    lowPowerMode: false,
    maxParticles: 100,
    maxBackgroundComplexity: 'full',
    chakraAnimationsEnabled: true,
    tier: 'high',
    autoDetected: false,
  };
}

/**
 * Device memory (GB) below which local model preload is considered
 * overburdening: downloading and warming Kokoro/Whisper while memory is
 * this low risks jank, tab crashes, or swap thrash on the host.
 */
export const LOW_DEVICE_MEMORY_GB = 4;

/**
 * Whether this device's hardware is overburdened for automatic model
 * preload. True when the overall tier is low, the GPU tier is low, or
 * reported device memory is below {@link LOW_DEVICE_MEMORY_GB}. When true,
 * callers must not preload Kokoro/Whisper automatically; they should ask
 * the user to opt in first.
 *
 * @param metrics - Detected performance metrics.
 * @returns True if automatic preload would overburden the device.
 */
export function isHardwareOverburdened(metrics: PerformanceMetrics): boolean {
  if (metrics.tier === 'low') return true;
  if (metrics.gpuTier === 'low') return true;
  if (
    metrics.deviceMemory !== undefined &&
    metrics.deviceMemory < LOW_DEVICE_MEMORY_GB
  ) {
    return true;
  }
  return false;
}

/**
 * Whether this device can run the local Kokoro/Whisper models at all
 * (WASM/WebGPU or local-transcription support). This is a capability check
 * only; use {@link isHardwareOverburdened} to decide whether preloading
 * should require explicit opt-in.
 *
 * @param metrics - Detected performance metrics.
 * @returns True if local model preload is technically supported.
 */
export function canPreloadModels(metrics: PerformanceMetrics): boolean {
  return Boolean(metrics.supportsLocalTranscription || metrics.supportsWebGPU);
}

// Quick synchronous detection (uses cached values if available)
let cachedMetrics: PerformanceMetrics | null = null;
let detectionPromise: Promise<PerformanceMetrics> | null = null;

export function getCachedPerformanceMetrics(): PerformanceMetrics | null {
  return cachedMetrics;
}

export function detectPerformanceCached(): Promise<PerformanceMetrics> {
  if (cachedMetrics) {
    return Promise.resolve(cachedMetrics);
  }

  if (detectionPromise) {
    return detectionPromise;
  }

  detectionPromise = detectPerformance()
    .then((metrics) => {
      cachedMetrics = metrics;
      return metrics;
    })
    .catch((err) => {
      // Allow retry on failure and never strand callers on a rejected cache.
      detectionPromise = null;
      console.error('[detectPerformance] failed, using fallback:', err);
      const fallback: PerformanceMetrics = {
        tier: 'low',
        score: 0,
        hardwareConcurrency:
          typeof navigator !== 'undefined'
            ? navigator.hardwareConcurrency || 2
            : 2,
        frameRate: 30,
        supportsWebGL2: false,
        supportsWebGPU: false,
        supportsSpeechSynthesis: false,
        availableVoices: 0,
        supportsMediaRecorder: false,
        supportsGetUserMedia: false,
        supportsLocalTranscription: false,
        supportsMicrophone: false,
      };
      cachedMetrics = fallback;
      return fallback;
    });

  return detectionPromise;
}
