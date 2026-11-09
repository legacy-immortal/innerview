/**
 * Waveform layer and settings types (public contract, re-exported from BackgroundControlPanel).
 *
 * @module background/waveformTypes.ts
 */
export interface WaveformLayer {
  readonly id: string;
  readonly color: string;
  readonly offset: number;
  readonly amplitude: number;
  readonly frequency: number;
  readonly phase: number;
}

export interface WaveformSettings {
  readonly pointCount: number;
  readonly breathingEnabled: boolean;
  readonly breathingSpeed: number;
  readonly breathingIntensity: number;
  readonly radius: number;
  readonly barWidth: number;
  readonly barLengthMultiplier: number;
  readonly animationSpeed: number;
  readonly animationSpeedIrregular: number;
  readonly animationSpeedHighFreq: number;
  readonly amplitudePowerAudio: number;
  readonly amplitudePowerSynthetic: number;
  readonly glowOpacityBase: number;
  readonly glowOpacityRange: number;
}
