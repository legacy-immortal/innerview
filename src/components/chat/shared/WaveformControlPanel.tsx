/**
 * WaveformControlPanel.tsx — Panel to configure waveform layers and visualization settings.
 *
 * @module components/chat/shared/WaveformControlPanel
 */

import { button, folder, useControls } from 'leva';
import { useEffect, useRef } from 'react';

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

interface WaveformControlPanelProps {
  readonly layers: WaveformLayer[];
  readonly onLayersChange: (layers: WaveformLayer[]) => void;
  readonly settings?: WaveformSettings;
  readonly onSettingsChange?: (settings: WaveformSettings) => void;
  readonly onLocalSettingsChange?: (settings: WaveformSettings) => void;
}

const DEFAULT_COLORS = [
  '#00D9FF',
  '#FF00FF',
  '#00FF88',
  '#FF8800',
  '#8800FF',
  '#FF0088',
];
const DEFAULT_SETTINGS: WaveformSettings = {
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

export const WaveformControlPanel = ({
  layers,
  onLayersChange,
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
  onLocalSettingsChange,
}: WaveformControlPanelProps) => {
  const prevSettingsRef = useRef<WaveformSettings>(settings);

  // Build layer controls dynamically
  // Leva controls can have various types (number, string, boolean, button, etc.)
  // Type assertion needed for dynamic schema construction
  const layerControls: Record<string, ReturnType<typeof folder>> = {};
  layers.forEach((layer, index) => {
    layerControls[`Layer ${index + 1}`] = folder({
      [`color_${layer.id}`]: {
        value: layer.color,
        label: 'Color',
      },
      [`offset_${layer.id}`]: {
        value: layer.offset,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: 'Offset',
      },
      [`amplitude_${layer.id}`]: {
        value: layer.amplitude,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Amp',
      },
      [`frequency_${layer.id}`]: {
        value: layer.frequency,
        min: 1,
        max: 6,
        step: 0.1,
        label: 'Freq',
      },
      [`phase_${layer.id}`]: {
        value: layer.phase,
        min: 0,
        max: Math.PI * 2,
        step: 0.01,
        label: 'Phase',
        format: (v: number) => `${(v / Math.PI).toFixed(1)}π`,
      },
      [`remove_${layer.id}`]: button(() => {
        if (layers.length > 1) {
          onLayersChange(layers.filter((l) => l.id !== layer.id));
        }
      }),
    });
  });

  // Leva controls for settings
  const levaSettings = useControls('Waveform', {
    Settings: folder({
      pointCount: {
        value: settings.pointCount,
        min: 0,
        max: 512,
        step: 1,
        label: 'Points',
      },
      radius: {
        value: settings.radius,
        min: 0.1,
        max: 0.5,
        step: 0.01,
        label: 'Radius',
        format: (v: number) => `${(v * 100).toFixed(0)}%`,
      },
      barWidth: {
        value: settings.barWidth,
        min: 0.005,
        max: 0.1,
        step: 0.005,
        label: 'Bar Width',
      },
      barLengthMultiplier: {
        value: settings.barLengthMultiplier,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        label: 'Bar Length',
        format: (v: number) => `${(v * 100).toFixed(0)}%`,
      },
    }),
    Breathing: folder({
      breathingEnabled: {
        value: settings.breathingEnabled,
        label: 'Enabled',
      },
      breathingSpeed: {
        value: settings.breathingSpeed,
        min: 0.005,
        max: 0.1,
        step: 0.005,
        label: 'Speed',
        render: () => settings.breathingEnabled,
      },
      breathingIntensity: {
        value: settings.breathingIntensity,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: 'Intensity',
        format: (v: number) => `${(v * 100).toFixed(0)}%`,
        render: () => settings.breathingEnabled,
      },
    }),
    Animation: folder({
      animationSpeed: {
        value: settings.animationSpeed,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        label: 'Base Speed',
      },
      animationSpeedIrregular: {
        value: settings.animationSpeedIrregular,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        label: 'Irregular Speed',
      },
      animationSpeedHighFreq: {
        value: settings.animationSpeedHighFreq,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        label: 'High Freq Speed',
      },
    }),
    Amplitude: folder({
      amplitudePowerAudio: {
        value: settings.amplitudePowerAudio,
        min: 0.1,
        max: 1.5,
        step: 0.05,
        label: 'Audio Power',
      },
      amplitudePowerSynthetic: {
        value: settings.amplitudePowerSynthetic,
        min: 0.1,
        max: 1.5,
        step: 0.05,
        label: 'Synthetic Power',
      },
    }),
    Glow: folder({
      glowOpacityBase: {
        value: settings.glowOpacityBase,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: 'Base Opacity',
      },
      glowOpacityRange: {
        value: settings.glowOpacityRange,
        min: 0,
        max: 0.2,
        step: 0.01,
        label: 'Opacity Range',
      },
    }),
    Layers: folder(layerControls as Parameters<typeof folder>[0]),
    Actions: folder({
      addLayer: button(() => {
        const newLayer: WaveformLayer = {
          id: `layer-${Date.now()}`,
          color: DEFAULT_COLORS[layers.length % DEFAULT_COLORS.length],
          offset: layers.length * 0.05,
          amplitude: 0.3,
          frequency: 3.0,
          phase: (layers.length * Math.PI) / 4,
        };
        onLayersChange([...layers, newLayer]);
      }),
    }),
  });

  // Update settings when Leva values change
  useEffect(() => {
    const newSettings: WaveformSettings = {
      pointCount: levaSettings.pointCount,
      radius: levaSettings.radius,
      breathingEnabled: levaSettings.breathingEnabled,
      breathingSpeed: levaSettings.breathingSpeed,
      breathingIntensity: levaSettings.breathingIntensity,
      barWidth: levaSettings.barWidth,
      barLengthMultiplier: levaSettings.barLengthMultiplier,
      animationSpeed: levaSettings.animationSpeed,
      animationSpeedIrregular: levaSettings.animationSpeedIrregular,
      animationSpeedHighFreq: levaSettings.animationSpeedHighFreq,
      amplitudePowerAudio: levaSettings.amplitudePowerAudio,
      amplitudePowerSynthetic: levaSettings.amplitudePowerSynthetic,
      glowOpacityBase: levaSettings.glowOpacityBase,
      glowOpacityRange: levaSettings.glowOpacityRange,
    };

    // Only update if settings actually changed
    const hasChanges = Object.keys(newSettings).some(
      (key) =>
        newSettings[key as keyof WaveformSettings] !==
        prevSettingsRef.current[key as keyof WaveformSettings]
    );

    if (hasChanges) {
      prevSettingsRef.current = newSettings;
      if (onLocalSettingsChange) {
        onLocalSettingsChange(newSettings);
      }
      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
    }
  }, [
    levaSettings.pointCount,
    levaSettings.radius,
    levaSettings.breathingEnabled,
    levaSettings.breathingSpeed,
    levaSettings.breathingIntensity,
    levaSettings.barWidth,
    levaSettings.barLengthMultiplier,
    levaSettings.animationSpeed,
    levaSettings.animationSpeedIrregular,
    levaSettings.animationSpeedHighFreq,
    levaSettings.amplitudePowerAudio,
    levaSettings.amplitudePowerSynthetic,
    levaSettings.glowOpacityBase,
    levaSettings.glowOpacityRange,
    onSettingsChange,
    onLocalSettingsChange,
  ]);

  // Update layers when Leva values change
  useEffect(() => {
    const updatedLayers = layers.map((layer) => {
      const colorKey = `color_${layer.id}`;
      const offsetKey = `offset_${layer.id}`;
      const amplitudeKey = `amplitude_${layer.id}`;
      const frequencyKey = `frequency_${layer.id}`;
      const phaseKey = `phase_${layer.id}`;

      const levaValue = levaSettings as Record<string, unknown>;

      return {
        ...layer,
        color: (levaValue[colorKey] as string) ?? layer.color,
        offset: (levaValue[offsetKey] as number) ?? layer.offset,
        amplitude: (levaValue[amplitudeKey] as number) ?? layer.amplitude,
        frequency: (levaValue[frequencyKey] as number) ?? layer.frequency,
        phase: (levaValue[phaseKey] as number) ?? layer.phase,
      };
    });

    // Check if any layer actually changed
    const hasChanges = updatedLayers.some((updated, index) => {
      const original = layers[index];
      return (
        updated.color !== original.color ||
        updated.offset !== original.offset ||
        updated.amplitude !== original.amplitude ||
        updated.frequency !== original.frequency ||
        updated.phase !== original.phase
      );
    });

    if (hasChanges) {
      onLayersChange(updatedLayers);
    }
  }, [levaSettings, layers, onLayersChange]);

  // Leva renders its own UI, so we don't need to return anything
  return null;
};
