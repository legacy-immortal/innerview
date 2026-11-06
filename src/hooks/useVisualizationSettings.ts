import { DEFAULT_SYSTEM_TEXT } from '@/components/animations/systemTextAnimation';
import type {
  WaveformLayer,
  WaveformSettings,
} from '@/components/background/BackgroundControlPanel';
import { useSettingsStore } from '@/lib/settings-store';
import type { BackgroundSettings } from '@/lib/settings-types';
import { useCallback, useEffect, useState } from 'react';

const defaultWaveformSettings: WaveformSettings = {
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

const defaultBackgroundSettings: BackgroundSettings = {
  type: 'hypnotic',
  opacity: 0.3,
  systemText: DEFAULT_SYSTEM_TEXT,
  intensity: 0.15,
  primaryColor1: [139 / 255, 92 / 255, 246 / 255],
  primaryColor2: [59 / 255, 130 / 255, 246 / 255],
  secondaryColor1: [99 / 255, 102 / 255, 241 / 255],
  secondaryColor2: [147 / 255, 51 / 255, 234 / 255],
  tertiaryColor1: [236 / 255, 72 / 255, 153 / 255],
  tertiaryColor2: [168 / 255, 85 / 255, 247 / 255],
  breathingEnabled: true,
  breathingSpeed: 0.5,
  breathingIntensity: 0.2,
  particlesEnabled: false,
  particlesCount: 8,
  particlesOpacity: 0.4,
  rotationSpeed1: 0.251327,
  rotationSpeed2: 0.17952,
  rotationSpeed3: 0.20944,
};

export const useVisualizationSettings = () => {
  const getWaveformEnabled = useSettingsStore(
    (state) => state.getWaveformEnabled
  );
  const saveWaveformEnabled = useSettingsStore(
    (state) => state.saveWaveformEnabled
  );
  const getWaveformSettings = useSettingsStore(
    (state) => state.getWaveformSettings
  );
  const saveWaveformSettings = useSettingsStore(
    (state) => state.saveWaveformSettings
  );
  const getWaveformLayers = useSettingsStore(
    (state) => state.getWaveformLayers
  );
  const saveWaveformLayers = useSettingsStore(
    (state) => state.saveWaveformLayers
  );
  const getBackgroundSettings = useSettingsStore(
    (state) => state.getBackgroundSettings
  );
  const saveBackgroundSettings = useSettingsStore(
    (state) => state.saveBackgroundSettings
  );

  // Waveform layers state - load from store on mount
  const [waveformLayers, setWaveformLayers] = useState<WaveformLayer[]>(() => {
    return getWaveformLayers();
  });

  // Waveform settings state - load from store on mount
  const [waveformSettings, setWaveformSettings] = useState<WaveformSettings>(
    () => {
      return getWaveformSettings() || defaultWaveformSettings;
    }
  );

  // Waveform enabled state - load from store on mount
  const [waveformEnabled, setWaveformEnabled] = useState(() => {
    return getWaveformEnabled();
  });

  // Background settings state - load from store on mount
  const [backgroundSettings, setBackgroundSettings] =
    useState<BackgroundSettings>(() => {
      const stored = getBackgroundSettings();
      if (stored) {
        // Normalize old format to new format if needed
        const merged = !stored.type
          ? ({
              ...(stored as unknown as Record<string, unknown>),
              type: 'hypnotic',
            } as BackgroundSettings)
          : stored;
        return {
          ...merged,
          systemText: merged.systemText ?? DEFAULT_SYSTEM_TEXT,
        };
      }
      return defaultBackgroundSettings;
    });

  // Save waveform settings to store when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveWaveformSettings(waveformSettings);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [waveformSettings, saveWaveformSettings]);

  // Save waveform layers to store when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveWaveformLayers(waveformLayers);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [waveformLayers, saveWaveformLayers]);

  // Save waveform enabled state to store when it changes (immediate, no debounce)
  useEffect(() => {
    saveWaveformEnabled(waveformEnabled);
  }, [waveformEnabled, saveWaveformEnabled]);

  // Save background settings to store when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveBackgroundSettings(backgroundSettings);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [backgroundSettings, saveBackgroundSettings]);

  const handleBackgroundSettingsChange = useCallback(
    (settings: BackgroundSettings) => {
      setBackgroundSettings(settings);
    },
    []
  );

  const handleWaveformSettingsChange = useCallback(
    (settings: WaveformSettings) => {
      setWaveformSettings(settings);
    },
    []
  );

  const handleLocalWaveformSettingsChange = useCallback(
    (localSettings: WaveformSettings) => {
      // Update settings immediately for real-time visual feedback
      setWaveformSettings(localSettings);
    },
    []
  );

  const handleWaveformLayersChange = useCallback((layers: WaveformLayer[]) => {
    setWaveformLayers(layers);
  }, []);

  const handleWaveformEnabledChange = useCallback((enabled: boolean) => {
    setWaveformEnabled(enabled);
  }, []);

  return {
    waveformLayers,
    waveformSettings,
    waveformEnabled,
    backgroundSettings,
    setWaveformLayers: handleWaveformLayersChange,
    setWaveformSettings: handleWaveformSettingsChange,
    setLocalWaveformSettings: handleLocalWaveformSettingsChange,
    setWaveformEnabled: handleWaveformEnabledChange,
    setBackgroundSettings: handleBackgroundSettingsChange,
  };
};
