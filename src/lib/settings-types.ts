/**
 * @file User settings domain types (TTS, transcription, generation, style, keyboard, performance).
 * @module lib/settings-types.ts
 */
// Settings types for the frontend (mirrored from backend)
export interface TTSSettings {
  provider:
    'kokoro' | 'xtts' | 'tts-webui' | 'elevenlabs' | 'vercel-ai' | 'browser';

  // API Keys and Endpoints
  elevenLabsApiKey?: string;
  xttsServerUrl?: string;
  ttsWebUIEndpoint?: string;

  kokoro?: {
    modelId?: string;
    dtype?: 'q8' | 'fp32' | 'fp16' | 'q4' | 'q4f16';
    device?: 'wasm' | 'webgpu';
    speakingRate?: number;
    defaultVoice?: string;
  };

  xtts?: {
    language?: string;
    temperature?: number;
    speed?: number;
    lengthPenalty?: number;
    repetitionPenalty?: number;
    topK?: number;
    topP?: number;
    streaming?: boolean;
    streamChunkSize?: number;
  };

  ttsWebUI?: {
    model?: string;
    voices?: string[];
    speed?: number;
    volume?: number;
    temperature?: number;
    exaggeration?: number;
    cfgWeight?: number;
    seed?: number;
    streaming?: boolean;
    device?: 'auto' | 'cpu' | 'cuda';
  };

  elevenLabs?: {
    model?: string;
    stability?: number;
    similarityBoost?: number;
    styleExaggeration?: number;
    speakerBoost?: boolean;
    speed?: number;
    voiceId?: string;
  };

  vercelAI?: {
    provider?: 'elevenlabs' | 'openai';
    elevenLabsApiKey?: string;
    elevenLabsModel?: string;
    elevenLabsVoiceId?: string;
    openaiApiKey?: string;
    openaiModel?: string;
    openaiVoice?: string;
    outputFormat?: string;
    speed?: number;
    language?: string;
  };

  browser?: {
    defaultVoice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
  };
}

export interface WaveformSettings {
  pointCount: number;
  breathingEnabled: boolean;
  breathingSpeed: number;
  breathingIntensity: number;
  radius: number;
  barWidth: number;
  barLengthMultiplier: number;
  animationSpeed: number;
  animationSpeedIrregular: number;
  animationSpeedHighFreq: number;
  amplitudePowerAudio: number;
  amplitudePowerSynthetic: number;
  glowOpacityBase: number;
  glowOpacityRange: number;
}

export interface WaveformLayer {
  id: string;
  color: string;
  offset: number;
  amplitude: number;
  frequency: number;
  phase: number;
}

export interface HypnoticBackgroundSettings {
  intensity: number;
  primaryColor1: [number, number, number];
  primaryColor2: [number, number, number];
  secondaryColor1: [number, number, number];
  secondaryColor2: [number, number, number];
  tertiaryColor1: [number, number, number];
  tertiaryColor2: [number, number, number];
  breathingEnabled: boolean;
  breathingSpeed: number;
  breathingIntensity: number;
  particlesEnabled: boolean;
  particlesCount: number;
  particlesOpacity: number;
  rotationSpeed1: number;
  rotationSpeed2: number;
  rotationSpeed3: number;
}

export type BackgroundType =
  | 'hypnotic'
  | 'dither'
  | 'waves'
  | 'pixelblast'
  | 'orb'
  | 'threads'
  | 'pulsar'
  | 'seele'
  | 'color'
  | 'imagedither';

/** Animation for the "[SYSTEM]:" label behind the chat: appear suddenly, hold, then fade out. */
export interface SystemTextAnimationSettings {
  /** Time to reach full opacity (ms). Keep low for "sudden" appear. */
  appearDurationMs: number;
  /** How long to stay fully visible (seconds). */
  holdDurationS: number;
  /** Fade-out duration (seconds). */
  fadeOutDurationS: number;
}

/** Id of the system data source to show when idle (network, frametiming, context, time). */
export type SystemVisualizationSourceId =
  'network' | 'frametiming' | 'context' | 'time';

/** Per-type options for system/cycle visualizations (clock, gauge, pie, sparkline). */
export interface SystemVisualizationTypeSettings {
  /** Clock: show seconds hand. */
  clock?: { showSeconds?: boolean };
}

/** Shared and per-type settings for cycling system visualizations. */
export interface SystemVisualizationSettings {
  /** Scale factor for all cycle visualizations (0.5–2). */
  scale?: number;
  /** Tint color (hex) applied to visualizations that support it. */
  color?: string;
  /** Horizontal offset in px from center. */
  offsetX?: number;
  /** Vertical offset in px from center. */
  offsetY?: number;
  /** Per-visualization-type options. */
  types?: SystemVisualizationTypeSettings;
}

export interface BackgroundSettings {
  type: BackgroundType;
  opacity?: number; // Global opacity for all background types (0-1), default 0.3
  systemText?: SystemTextAnimationSettings;
  /** Which system visualization to show when idle. When cycleSystemVisualizations is false, this source is shown. */
  systemVisualizationSourceId?: SystemVisualizationSourceId | null;
  /** When true, cycle through system visualizations on an interval; when false, stay on systemVisualizationSourceId. */
  cycleSystemVisualizations?: boolean;
  /** Duration (ms) each visualization is shown when cycling. */
  systemVisualizationCycleDurationMs?: number;
  /** Scale, color, position, and per-type options for cycle visualizations. */
  systemVisualization?: SystemVisualizationSettings;
  // Hypnotic background properties (used when type === 'hypnotic')
  intensity?: number;
  primaryColor1?: [number, number, number];
  primaryColor2?: [number, number, number];
  secondaryColor1?: [number, number, number];
  secondaryColor2?: [number, number, number];
  tertiaryColor1?: [number, number, number];
  tertiaryColor2?: [number, number, number];
  breathingEnabled?: boolean;
  breathingSpeed?: number;
  breathingIntensity?: number;
  particlesEnabled?: boolean;
  particlesCount?: number;
  particlesOpacity?: number;
  rotationSpeed1?: number;
  rotationSpeed2?: number;
  rotationSpeed3?: number;
  // Legacy nested hypnotic property (for backward compatibility)
  hypnotic?: HypnoticBackgroundSettings;
  dither?: {
    waveSpeed?: number;
    waveFrequency?: number;
    waveAmplitude?: number;
    waveColor?: string;
    enableMouseInteraction?: boolean;
    mouseRadius?: number;
  };
  waves?: {
    pointCount?: number;
    speed?: number;
    amplitude?: number;
    color?: string;
    enableMouseInteraction?: boolean;
    xGap?: number;
    yGap?: number;
    reverseX?: boolean;
    reverseY?: boolean;
  };
  pixelblast?: {
    variant?: 'square' | 'circle' | 'triangle' | 'diamond';
    pixelSize?: number;
    color?: string;
    patternScale?: number;
    patternDensity?: number;
    liquid?: boolean;
    liquidStrength?: number;
    speed?: number;
  };
  orb?: {
    hue?: number;
    hoverIntensity?: number;
    rotateOnHover?: boolean;
  };
  threads?: {
    color?: [number, number, number];
    amplitude?: number;
    distance?: number;
    enableMouseInteraction?: boolean;
  };
  pulsar?: {
    lineSpacing?: number;
    lineColor?: string;
    bgColor?: string;
    rotationX?: number;
    rotationY?: number;
    scale?: number;
    verticalScale?: number;
    animationSpeed?: number;
  };
  seele?: {
    textColor?: string;
    bgColor?: string;
    topText?: string;
    bottomText?: string;
    fontFamily?: string;
    numberSize?: number;
    labelSize?: number;
    pulseSpeed?: number;
    pulseIntensity?: number;
    scanlineSpeed?: number;
    scanlineOpacity?: number;
    scanlineColor?: string;
    showNumber?: boolean;
    seeleNumber?: number;
  };
  color?: {
    color?: string;
    gradientEnabled?: boolean;
    gradientColor?: string;
    gradientDirection?: 'horizontal' | 'vertical' | 'diagonal' | 'radial';
    scanlineEnabled?: boolean;
    scanlineOpacity?: number;
    scanlineSpeed?: number;
    scanlineColor?: string;
  };
  imagedither?: {
    image?: string;
    type?: 'random' | '2x2' | '4x4' | '8x8';
    pxSize?: number;
    colorSteps?: number;
    originalColors?: boolean;
    colorFront?: string;
    colorBack?: string;
    colorHighlight?: string;
    scale?: number;
    rotation?: number;
    offsetX?: number;
    offsetY?: number;
    fit?: 'contain' | 'cover' | 'fill';
  };
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
  autoDetected?: boolean; // Whether settings were auto-detected
  tier?: 'low' | 'medium' | 'high'; // Detected performance tier
}

export interface TranscriptionSettings {
  provider: 'openai' | 'local';
  language?: string;
  modelId?: string;
  timestampGranularities?: ('word' | 'segment')[];
  task?: 'transcribe' | 'translate';
  openai?: {
    modelId?: string;
    language?: string;
    timestampGranularities?: ('word' | 'segment')[];
  };
  local?: {
    mode?: 'browser' | 'backend'; // Browser runs in-browser via Transformers.js, Backend uses server API
    modelId?: string;
    language?: string;
    task?: 'transcribe' | 'translate';
    quantized?: boolean;
  };
}

export interface KeyboardSettings {
  transcriptionKey: string;
  submitKeypress?: string; // Key combination for submitting (e.g., 'shift+enter', 'enter', 'ctrl+enter')
  enabled: boolean;
  prevVisualizationKey?: string; // Key for previous visualization (default: ',')
  nextVisualizationKey?: string; // Key for next visualization (default: '.')
  exitTerminalKey?: string; // Key combination to exit terminal mode (default: 'ctrl+shift+e')
}

export type LayoutMode = 'condensed' | 'corpo' | 'terminal';

export interface StyleSettings {
  mode?: LayoutMode; // Layout mode: 'condensed' (current), 'corpo' (ChatGPT-like), 'terminal' (fullscreen terminal)
  sidebarBackgroundColor?: string; // CSS color value (hex, rgb, rgba, transparent, etc.)
  sidebarHeaderBackgroundColor?: string; // Background color for sidebar header sections
  sidebarConversationItemBackgroundColor?: string; // Default background for conversation items
  sidebarConversationItemHoverBackgroundColor?: string; // Background on hover for conversation items
  sidebarConversationItemActiveBackgroundColor?: string; // Background for active/selected conversation items
  promptInputBackgroundColor?: string; // Background color for the prompt input field
  controlPanelCollapsed?: boolean; // Whether the background control panel is collapsed
}

export interface GenerationSettings {
  baseURL?: string; // Base URL for OpenAI-compatible API (e.g., 'https://api.openai.com/v1' or 'https://localhost:5001/v1')
  apiKey?: string; // API key for remote providers (not used for typical local hosts)
  temperature?: number; // Sampling temperature (0-2), higher = more creative
  maxTokens?: number; // Maximum tokens to generate
  topP?: number; // Nucleus sampling parameter (0-1)
  topK?: number; // Top-K sampling parameter (1-100), limits to top K tokens
  frequencyPenalty?: number; // Frequency penalty (-2 to 2), reduces repetition
  presencePenalty?: number; // Presence penalty (-2 to 2), encourages new topics
  stopSequences?: string[]; // Stop sequences - generation stops when these strings are encountered
  seed?: number; // Random seed for deterministic outputs (integer)
  modelName?: string; // Model name to use (e.g., 'gpt-5', 'gpt-4o-mini')
  availableModels?: string[]; // List of available models fetched from the API
  reasoningTag?: string; // Tag name for reasoning blocks (e.g., 'thinking', 'reasoning'). Default: 'thinking'
  // Streaming settings
  streamingEnabled?: boolean; // Enable token streaming for real-time display. Default: true
  // Agent middleware and memory settings
  enableAssociativeMemory?: boolean; // Enable associative memory injection from vector store
  enableSummaryMemory?: boolean; // Enable conversation summarization middleware
  enableConstitutionMiddleware?: boolean; // Enable constitutional prompt middleware
  enableAppealProcess?: boolean; // Enable appeal process in guardrails middleware
}

export interface UserSettings {
  userId?: string;
  sessionId?: string;
  tts?: TTSSettings;
  transcription?: TranscriptionSettings;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    [key: string]: unknown;
  };
  waveform?: {
    enabled?: boolean;
    settings?: WaveformSettings;
    layers?: WaveformLayer[];
  };
  background?: BackgroundSettings; // Unified background settings type
  performance?: PerformanceSettings; // Performance-aware settings
  keyboard?: KeyboardSettings; // Keyboard shortcuts settings
  style?: StyleSettings; // Style settings (colors, etc.)
  generation?: GenerationSettings; // Generation settings for OpenAI-compatible models
  updatedAt?: string;
}
