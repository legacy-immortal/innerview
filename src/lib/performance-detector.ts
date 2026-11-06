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

// Measure frame rate using requestAnimationFrame
async function measureFrameRate(duration = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let lastTime = performance.now();
    const startTime = lastTime;

    function countFrame() {
      frames++;
      const currentTime = performance.now();

      if (currentTime - startTime >= duration) {
        const fps = Math.round((frames * 1000) / (currentTime - startTime));
        resolve(fps);
        return;
      }

      lastTime = currentTime;
      requestAnimationFrame(countFrame);
    }

    requestAnimationFrame(countFrame);
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

// Detect performance metrics
export async function detectPerformance(): Promise<PerformanceMetrics> {
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;

  const supportsWebGL2 = !!document
    .createElement('canvas')
    .getContext('webgl2');

  const supportsWebGPU = !!(navigator.gpu || (window as { gpu?: unknown }).gpu);

  const gpuTier = detectGPUTier();
  const frameRate = await measureFrameRate(500); // Quick 500ms test

  // Detect TTS capabilities
  const ttsCapabilities = detectTTSCapabilities();

  // Wait for voices to load if speech synthesis is supported
  if (
    ttsCapabilities.supportsSpeechSynthesis &&
    ttsCapabilities.availableVoices === 0
  ) {
    // Wait a bit for voices to load
    await new Promise((resolve) => {
      if (window.speechSynthesis.getVoices().length > 0) {
        resolve(undefined);
      } else {
        const timeout = setTimeout(() => resolve(undefined), 500);
        window.speechSynthesis.onvoiceschanged = () => {
          clearTimeout(timeout);
          resolve(undefined);
        };
      }
    });
    // Update voice count after waiting
    ttsCapabilities.availableVoices = window.speechSynthesis.getVoices().length;
  }

  // Detect transcription capabilities
  const transcriptionCapabilities = detectTranscriptionCapabilities();

  const metrics: Omit<PerformanceMetrics, 'score' | 'tier'> = {
    hardwareConcurrency,
    deviceMemory,
    gpuTier,
    frameRate,
    supportsWebGL2,
    supportsWebGPU,
    ...ttsCapabilities,
    ...transcriptionCapabilities,
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

  detectionPromise = detectPerformance().then((metrics) => {
    cachedMetrics = metrics;
    return metrics;
  });

  return detectionPromise;
}
