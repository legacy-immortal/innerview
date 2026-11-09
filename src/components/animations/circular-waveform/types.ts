import type {
  WaveformLayer,
  WaveformSettings,
} from '@/components/background/BackgroundControlPanel';
import type { useSystemDataSource } from '@/hooks/useSystemDataSource';

/**
 * @file Shared types and defaults for the circular waveform animation.
 * `WaveformLayer` and `WaveformSettings` are owned by the background
 * control panel and re-exported here so waveform props stay self-contained.
 */

export type { WaveformLayer, WaveformSettings };

/** Props for the circular waveform visualization. */
export interface CircularWaveformProps {
  readonly isActive: boolean;
  readonly audioElement?: HTMLAudioElement | null;
  readonly analyserNode?: AnalyserNode | null;
  readonly useSpeechSynthesis?: boolean;
  readonly isIdle?: boolean;
  readonly layers?: readonly WaveformLayer[];
  readonly settings?: WaveformSettings;
  readonly systemDataSource?: ReturnType<typeof useSystemDataSource>;
}

export const DEFAULT_SETTINGS: WaveformSettings = {
  pointCount: 256,
  breathingEnabled: true,
  breathingSpeed: 0.02,
  breathingIntensity: 0.15,
  radius: 0.25,
  barWidth: 0.02,
  barLengthMultiplier: 0.5,
  animationSpeed: 0.5,
  animationSpeedIrregular: 0.3,
  animationSpeedHighFreq: 0.6,
  amplitudePowerAudio: 0.7,
  amplitudePowerSynthetic: 0.75,
  glowOpacityBase: 0.15,
  glowOpacityRange: 0.08,
};

// Default layers
export const DEFAULT_LAYERS: WaveformLayer[] = [
  {
    id: '1',
    color: '#00D9FF',
    offset: 0,
    amplitude: 0.4,
    frequency: 2.5,
    phase: 0,
  },
  {
    id: '2',
    color: '#FF00FF',
    offset: 0.08,
    amplitude: 0.35,
    frequency: 2.2,
    phase: Math.PI / 4,
  },
  {
    id: '3',
    color: '#00D9FF',
    offset: 0.15,
    amplitude: 0.45,
    frequency: 2.8,
    phase: Math.PI / 2,
  },
  {
    id: '4',
    color: '#FF00FF',
    offset: 0.22,
    amplitude: 0.38,
    frequency: 2.1,
    phase: Math.PI * 0.75,
  },
  {
    id: '5',
    color: '#00D9FF',
    offset: 0.28,
    amplitude: 0.42,
    frequency: 3.0,
    phase: Math.PI,
  },
  {
    id: '6',
    color: '#FF00FF',
    offset: 0.35,
    amplitude: 0.36,
    frequency: 2.4,
    phase: Math.PI * 1.25,
  },
  {
    id: '7',
    color: '#00D9FF',
    offset: 0.42,
    amplitude: 0.48,
    frequency: 2.6,
    phase: Math.PI * 1.5,
  },
];
