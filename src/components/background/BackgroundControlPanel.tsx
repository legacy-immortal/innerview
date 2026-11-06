import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
import { DEFAULT_SYSTEM_TEXT } from '@/components/animations/systemTextAnimation';
import { useSettingsStore } from '@/lib/settings-store';
import type {
  BackgroundSettings,
  BackgroundType,
  SystemTextAnimationSettings,
  SystemVisualizationSettings,
  SystemVisualizationSourceId,
} from '@/lib/settings-types';
import {
  Box,
  Button,
  Collapsible,
  Field,
  HStack,
  IconButton,
  Input,
  NumberInput,
  Slider,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { HiChevronLeft, HiChevronRight, HiPlus, HiTrash } from 'react-icons/hi';
import { BackgroundTypeSelector } from './BackgroundTypeSelector';
import { ColorControls } from './ColorControls';
import { DitherControls } from './DitherControls';
import { HypnoticControls } from './HypnoticControls';
import { ImageDitherControls } from './ImageDitherControls';
import { OrbControls } from './OrbControls';
import { PixelBlastControls } from './PixelBlastControls';
import { PulsarControls } from './PulsarControls';
import { SeeleControls } from './SeeleControls';
import { SystemTextSection } from './SystemTextSection';
import { SystemVisualizationSection } from './SystemVisualizationSection';
import { ThreadsControls } from './ThreadsControls';
import { WavesControls } from './WavesControls';
import {
  DEFAULT_COLORS,
  hexToRgb,
  rgbToHex,
  type ThemePreset,
} from './backgroundControlUtils';

export interface WaveformLayer {
  id: string;
  color: string;
  offset: number;
  amplitude: number;
  frequency: number;
  phase: number;
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

interface BackgroundControlPanelProps {
  settings: BackgroundSettings;
  onSettingsChange: (settings: BackgroundSettings) => void;
  waveformLayers?: WaveformLayer[];
  onWaveformLayersChange?: (layers: WaveformLayer[]) => void;
  waveformSettings?: WaveformSettings;
  onWaveformSettingsChange?: (settings: WaveformSettings) => void;
  onLocalWaveformSettingsChange?: (settings: WaveformSettings) => void;
  waveformEnabled?: boolean;
  onWaveformEnabledChange?: (enabled: boolean) => void;
}

const BackgroundControlPanelComponent = ({
  settings,
  onSettingsChange,
  waveformLayers = [],
  onWaveformLayersChange,
  waveformSettings,
  onWaveformSettingsChange,
  onLocalWaveformSettingsChange,
  waveformEnabled = true,
  onWaveformEnabledChange,
}: BackgroundControlPanelProps) => {
  const [intensityOpen, setIntensityOpen] = useState(true);
  const [breathingOpen, setBreathingOpen] = useState(true);
  const [particlesOpen, setParticlesOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(true);
  const [rotationOpen, setRotationOpen] = useState(false);

  // Background type specific section states
  const [ditherOpen, setDitherOpen] = useState(false);
  const [wavesOpen, setWavesOpen] = useState(false);
  const [pixelblastOpen, setPixelblastOpen] = useState(false);
  const [orbOpen, setOrbOpen] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [pulsarOpen, setPulsarOpen] = useState(false);
  const [seeleOpen, setSeeleOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [imageditherOpen, setImageditherOpen] = useState(false);
  const imageDitherFileInputRef = useRef<HTMLInputElement>(null);

  // Waveform section states
  const [waveformSettingsOpen, setWaveformSettingsOpen] = useState(false);
  const [systemTextOpen, setSystemTextOpen] = useState(false);
  const [systemVisualizationOpen, setSystemVisualizationOpen] = useState(false);
  const [waveformBreathingOpen, setWaveformBreathingOpen] = useState(false);
  const [waveformAnimationOpen, setWaveformAnimationOpen] = useState(false);
  const [waveformAmplitudeOpen, setWaveformAmplitudeOpen] = useState(false);
  const [waveformGlowOpen, setWaveformGlowOpen] = useState(false);
  const [waveformLayersOpen, setWaveformLayersOpen] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

  // Load control panel collapsed state from store
  const getStyleSettings = useSettingsStore((state) => state.getStyleSettings);
  const updateStyleSettings = useSettingsStore(
    (state) => state.updateStyleSettings
  );
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const styleSettings = getStyleSettings();
    return styleSettings?.controlPanelCollapsed ?? false;
  });

  // Save control panel collapsed state to store when it changes
  useEffect(() => {
    updateStyleSettings({ controlPanelCollapsed: isCollapsed });
  }, [isCollapsed, updateStyleSettings]);

  // Get current background type (default to 'hypnotic' for backward compatibility)
  const currentBackgroundType: BackgroundType = settings.type || 'hypnotic';

  // Ensure color settings are initialized when type is 'color'
  useEffect(() => {
    if (currentBackgroundType === 'color' && !settings.color) {
      onSettingsChange({
        ...settings,
        color: {
          color: '#000000',
          gradientEnabled: false,
          gradientColor: '#ffffff',
          gradientDirection: 'vertical',
          scanlineEnabled: false,
          scanlineOpacity: 0.1,
          scanlineSpeed: 1,
          scanlineColor: '#ffffff',
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBackgroundType, settings.type, settings.color]);

  // Helper to get hypnotic settings (from top-level or nested hypnotic property for backward compatibility)
  const getHypnoticSettings = (): HypnoticBackgroundSettings | undefined => {
    // If settings has hypnotic properties at top level, use those
    if (settings.intensity !== undefined) {
      // Default colors if undefined
      const defaultColors = {
        primaryColor1: [139 / 255, 92 / 255, 246 / 255] as [
          number,
          number,
          number,
        ],
        primaryColor2: [59 / 255, 130 / 255, 246 / 255] as [
          number,
          number,
          number,
        ],
        secondaryColor1: [99 / 255, 102 / 255, 241 / 255] as [
          number,
          number,
          number,
        ],
        secondaryColor2: [147 / 255, 51 / 255, 234 / 255] as [
          number,
          number,
          number,
        ],
        tertiaryColor1: [236 / 255, 72 / 255, 153 / 255] as [
          number,
          number,
          number,
        ],
        tertiaryColor2: [168 / 255, 85 / 255, 247 / 255] as [
          number,
          number,
          number,
        ],
      };
      return {
        intensity: settings.intensity,
        primaryColor1: settings.primaryColor1 ?? defaultColors.primaryColor1,
        primaryColor2: settings.primaryColor2 ?? defaultColors.primaryColor2,
        secondaryColor1:
          settings.secondaryColor1 ?? defaultColors.secondaryColor1,
        secondaryColor2:
          settings.secondaryColor2 ?? defaultColors.secondaryColor2,
        tertiaryColor1: settings.tertiaryColor1 ?? defaultColors.tertiaryColor1,
        tertiaryColor2: settings.tertiaryColor2 ?? defaultColors.tertiaryColor2,
        breathingEnabled: settings.breathingEnabled ?? false,
        breathingSpeed: settings.breathingSpeed ?? 0.02,
        breathingIntensity: settings.breathingIntensity ?? 0.1,
        particlesEnabled: settings.particlesEnabled ?? false,
        particlesCount: settings.particlesCount ?? 50,
        particlesOpacity: settings.particlesOpacity ?? 0.5,
        rotationSpeed1: settings.rotationSpeed1 ?? 0.1,
        rotationSpeed2: settings.rotationSpeed2 ?? 0.1,
        rotationSpeed3: settings.rotationSpeed3 ?? 0.1,
      };
    }
    // Otherwise check nested hypnotic property (backward compatibility)
    return settings.hypnotic;
  };

  const hypnoticSettings = getHypnoticSettings();

  const safeSystemText = settings.systemText ?? DEFAULT_SYSTEM_TEXT;

  const updateSystemText = useCallback(
    <K extends keyof SystemTextAnimationSettings>(
      key: K,
      value: SystemTextAnimationSettings[K]
    ) => {
      onSettingsChange({
        ...settings,
        systemText: {
          ...safeSystemText,
          [key]: value,
        },
      });
    },
    [onSettingsChange, settings, safeSystemText]
  );

  const updateSystemVisualizationSource = useCallback(
    (sourceId: SystemVisualizationSourceId | '') => {
      onSettingsChange({
        ...settings,
        systemVisualizationSourceId:
          sourceId === ''
            ? undefined
            : (sourceId as SystemVisualizationSourceId),
      });
    },
    [onSettingsChange, settings]
  );

  const updateCycleSystemVisualizations = useCallback(
    (cycle: boolean) => {
      onSettingsChange({
        ...settings,
        cycleSystemVisualizations: cycle,
      });
    },
    [onSettingsChange, settings]
  );

  const CYCLE_DURATION_MS_MIN = 2000;
  const CYCLE_DURATION_MS_MAX = 120000;

  const updateSystemVisualizationCycleDuration = useCallback(
    (durationMs: number) => {
      const clamped = Math.round(
        Math.max(
          CYCLE_DURATION_MS_MIN,
          Math.min(CYCLE_DURATION_MS_MAX, durationMs)
        )
      );
      onSettingsChange({
        ...settings,
        systemVisualizationCycleDurationMs: clamped,
      });
    },
    [onSettingsChange, settings]
  );

  const updateSystemVisualization = useCallback(
    (patch: Partial<SystemVisualizationSettings>) => {
      const prev = settings.systemVisualization ?? {};
      onSettingsChange({
        ...settings,
        systemVisualization: { ...prev, ...patch },
      });
    },
    [onSettingsChange, settings]
  );

  const updateSystemVisualizationTypes = useCallback(
    (
      typeKey: keyof NonNullable<SystemVisualizationSettings['types']>,
      patch: Record<string, unknown>
    ) => {
      const prev = settings.systemVisualization ?? {};
      const prevTypes = prev.types ?? {};
      onSettingsChange({
        ...settings,
        systemVisualization: {
          ...prev,
          types: {
            ...prevTypes,
            [typeKey]: { ...prevTypes[typeKey], ...patch },
          },
        },
      });
    },
    [onSettingsChange, settings]
  );

  // Default waveform settings if not provided
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

  // Use default if waveformSettings is not provided
  const safeWaveformSettings = waveformSettings ?? defaultWaveformSettings;

  // Update background type
  const updateBackgroundType = useCallback(
    (type: BackgroundType) => {
      const updatedSettings: BackgroundSettings = { ...settings, type };

      // Initialize type-specific settings if switching to a new type
      if (type === 'color' && !updatedSettings.color) {
        updatedSettings.color = {
          color: '#000000',
          gradientEnabled: false,
          gradientColor: '#ffffff',
          gradientDirection: 'vertical',
          scanlineEnabled: false,
          scanlineOpacity: 0.1,
          scanlineSpeed: 1,
          scanlineColor: '#ffffff',
        };
      }

      onSettingsChange(updatedSettings);
    },
    [settings, onSettingsChange]
  );

  // Update hypnotic setting - memoized to prevent callback recreation
  const updateSetting = useCallback(
    <K extends keyof HypnoticBackgroundSettings>(
      key: K,
      value: HypnoticBackgroundSettings[K]
    ) => {
      onSettingsChange({
        ...settings,
        [key]: value,
      });
    },
    [settings, onSettingsChange]
  );

  // Update dither settings - memoized
  const updateDitherSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['dither']>>(
      key: K,
      value: NonNullable<BackgroundSettings['dither']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        dither: {
          ...settings.dither,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  // Update waves settings - memoized
  const updateWavesSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['waves']>>(
      key: K,
      value: NonNullable<BackgroundSettings['waves']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        waves: {
          ...settings.waves,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  // Update pixelblast settings - memoized
  const updatePixelblastSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['pixelblast']>>(
      key: K,
      value: NonNullable<BackgroundSettings['pixelblast']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        pixelblast: {
          ...settings.pixelblast,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  // Update orb settings - memoized
  const updateOrbSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['orb']>>(
      key: K,
      value: NonNullable<BackgroundSettings['orb']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        orb: {
          ...settings.orb,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  // Update threads settings - memoized
  const updateThreadsSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['threads']>>(
      key: K,
      value: NonNullable<BackgroundSettings['threads']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        threads: {
          ...settings.threads,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  // Update pulsar settings - memoized
  const updatePulsarSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['pulsar']>>(
      key: K,
      value: NonNullable<BackgroundSettings['pulsar']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        pulsar: {
          ...settings.pulsar,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  // Update seele settings - memoized
  const updateSeeleSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['seele']>>(
      key: K,
      value: NonNullable<BackgroundSettings['seele']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        seele: {
          ...settings.seele,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  // Update color settings - memoized
  const updateColorSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['color']>>(
      key: K,
      value: NonNullable<BackgroundSettings['color']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        color: {
          color: '#000000',
          gradientEnabled: false,
          gradientColor: '#ffffff',
          gradientDirection: 'vertical',
          scanlineEnabled: false,
          scanlineOpacity: 0.1,
          scanlineSpeed: 1,
          scanlineColor: '#ffffff',
          ...settings.color,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  // Update image dither settings - memoized
  const updateImageDitherSetting = useCallback(
    <K extends keyof NonNullable<BackgroundSettings['imagedither']>>(
      key: K,
      value: NonNullable<BackgroundSettings['imagedither']>[K]
    ) => {
      onSettingsChange({
        ...settings,
        imagedither: {
          ...settings.imagedither,
          [key]: value,
        },
      });
    },
    [settings, onSettingsChange]
  );

  const handleImageDitherFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl === 'string') {
          updateImageDitherSetting('image', dataUrl);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [updateImageDitherSetting]
  );

  const updateColor = useCallback(
    (
      colorKey:
        | 'primaryColor1'
        | 'primaryColor2'
        | 'secondaryColor1'
        | 'secondaryColor2'
        | 'tertiaryColor1'
        | 'tertiaryColor2',
      hex: string
    ) => {
      updateSetting(colorKey, hexToRgb(hex));
    },
    [updateSetting]
  );

  const applyTheme = (theme: ThemePreset) => {
    // Normalize hex values to ensure exact matching
    const normalizeHex = (hex: string): string => {
      return hex.toUpperCase().startsWith('#')
        ? hex.toUpperCase()
        : `#${hex.toUpperCase()}`;
    };

    // Convert all theme colors to RGB arrays and update settings
    onSettingsChange({
      ...settings,
      type: settings.type || 'hypnotic',
      primaryColor1: hexToRgb(normalizeHex(theme.primaryColor1)),
      primaryColor2: hexToRgb(normalizeHex(theme.primaryColor2)),
      secondaryColor1: hexToRgb(normalizeHex(theme.secondaryColor1)),
      secondaryColor2: hexToRgb(normalizeHex(theme.secondaryColor2)),
      tertiaryColor1: hexToRgb(normalizeHex(theme.tertiaryColor1)),
      tertiaryColor2: hexToRgb(normalizeHex(theme.tertiaryColor2)),
    });
  };

  // Check if current settings match a theme (with tolerance for floating point precision)
  const matchesTheme = (theme: ThemePreset): boolean => {
    if (!hypnoticSettings) return false;
    // Use hex comparison for exact matching, with RGB fallback for tolerance
    // This is more reliable than just RGB comparison
    const colorKeys: Array<
      | 'primaryColor1'
      | 'primaryColor2'
      | 'secondaryColor1'
      | 'secondaryColor2'
      | 'tertiaryColor1'
      | 'tertiaryColor2'
    > = [
      'primaryColor1',
      'primaryColor2',
      'secondaryColor1',
      'secondaryColor2',
      'tertiaryColor1',
      'tertiaryColor2',
    ];

    return colorKeys.every((key) => {
      const themeHex = theme[key].toUpperCase().startsWith('#')
        ? theme[key].toUpperCase()
        : `#${theme[key].toUpperCase()}`;
      const currentHex = rgbToHex(hypnoticSettings?.[key]).toUpperCase();

      // First try exact hex match (most reliable)
      if (currentHex === themeHex) {
        return true;
      }

      // Fallback to RGB comparison with tolerance for floating point precision
      // This handles cases where HTML color inputs might slightly modify values
      const tolerance = 0.002; // Allow small floating point differences (about 0.5 RGB units)
      const themeRgb = hexToRgb(themeHex);
      const currentRgb = hypnoticSettings[key];
      const rMatch = Math.abs(themeRgb[0] - currentRgb[0]) < tolerance;
      const gMatch = Math.abs(themeRgb[1] - currentRgb[1]) < tolerance;
      const bMatch = Math.abs(themeRgb[2] - currentRgb[2]) < tolerance;
      return rMatch && gMatch && bMatch;
    });
  };

  const updateWaveformSetting = <K extends keyof WaveformSettings>(
    key: K,
    value: WaveformSettings[K]
  ) => {
    if (!waveformSettings || !onWaveformSettingsChange) return;
    onWaveformSettingsChange({ ...waveformSettings, [key]: value });
    if (onLocalWaveformSettingsChange) {
      onLocalWaveformSettingsChange({ ...waveformSettings, [key]: value });
    }
  };

  const updateWaveformLayer = (
    layerId: string,
    updates: Partial<WaveformLayer>
  ) => {
    if (!onWaveformLayersChange) return;
    const updated = waveformLayers.map((layer) =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    );
    onWaveformLayersChange(updated);
  };

  const addWaveformLayer = () => {
    if (!onWaveformLayersChange) return;
    const newLayer: WaveformLayer = {
      id: `layer-${Date.now()}`,
      color: DEFAULT_COLORS[waveformLayers.length % DEFAULT_COLORS.length],
      offset: waveformLayers.length * 0.05,
      amplitude: 0.3,
      frequency: 3.0,
      phase: (waveformLayers.length * Math.PI) / 4,
    };
    onWaveformLayersChange([...waveformLayers, newLayer]);
  };

  const removeWaveformLayer = (layerId: string) => {
    if (!onWaveformLayersChange || waveformLayers.length <= 1) return;
    onWaveformLayersChange(waveformLayers.filter((l) => l.id !== layerId));
    const newExpanded = new Set(expandedLayers);
    newExpanded.delete(layerId);
    setExpandedLayers(newExpanded);
  };

  const toggleLayerExpanded = (layerId: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  return (
    <>
      {isCollapsed ? (
        <IconButton
          position="fixed"
          right={4}
          top={4}
          aria-label="Expand control panel"
          size="sm"
          variant="ghost"
          colorPalette="gray"
          onClick={() => setIsCollapsed(false)}
          zIndex={1000}
        >
          <HiChevronLeft />
        </IconButton>
      ) : (
        <Box
          position="fixed"
          right={4}
          top={4}
          bottom={4}
          w="320px"
          bg="rgba(0, 0, 0, 0.6)"
          backdropFilter="blur(8px)"
          border="1px solid"
          borderColor="rgba(255, 255, 255, 0.1)"
          borderRadius="md"
          p={4}
          overflowY="auto"
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          fontSize="xs"
          zIndex={1000}
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.25)',
              },
            },
            '&::-webkit-scrollbar-corner': {
              background: 'transparent',
            },
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
          }}
        >
          <VStack gap={4} align="stretch">
            <HStack justify="space-between" align="center" mb={2}>
              <Text
                fontSize="sm"
                fontWeight={600}
                color="white"
                letterSpacing="0.1em"
              >
                CONTROLS
              </Text>
              <IconButton
                aria-label="Collapse control panel"
                size="xs"
                variant="ghost"
                colorPalette="gray"
                onClick={() => setIsCollapsed(true)}
              >
                <HiChevronRight />
              </IconButton>
            </HStack>

            <BackgroundTypeSelector
              settings={settings}
              onSettingsChange={onSettingsChange}
              currentBackgroundType={currentBackgroundType}
              onBackgroundTypeChange={updateBackgroundType}
            />

            <SystemTextSection
              open={systemTextOpen}
              onOpenChange={setSystemTextOpen}
              systemText={safeSystemText}
              onSystemTextChange={updateSystemText}
            />

            <SystemVisualizationSection
              open={systemVisualizationOpen}
              onOpenChange={setSystemVisualizationOpen}
              settings={settings}
              onSourceChange={updateSystemVisualizationSource}
              onCycleChange={updateCycleSystemVisualizations}
              onCycleDurationChange={updateSystemVisualizationCycleDuration}
              onSystemVisualizationChange={updateSystemVisualization}
              onSystemVisualizationTypesChange={updateSystemVisualizationTypes}
            />

            {/* Waveform Section */}
            {waveformSettings && (
              <>
                {/* Waveform Enable/Disable Toggle */}
                <Box
                  px={3}
                  py={2}
                  borderBottom="1px solid"
                  borderColor="rgba(255, 255, 255, 0.1)"
                >
                  <HStack justify="space-between" align="center">
                    <Text
                      fontSize="xs"
                      color="gray.300"
                      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                    >
                      Waveform Enabled
                    </Text>
                    <Switch.Root
                      checked={waveformEnabled}
                      onCheckedChange={(e) => {
                        if (onWaveformEnabledChange) {
                          onWaveformEnabledChange(e.checked);
                        }
                      }}
                      size="sm"
                      colorPalette="purple"
                    >
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                  </HStack>
                </Box>

                <Collapsible.Root
                  open={waveformSettingsOpen}
                  onOpenChange={(e) => setWaveformSettingsOpen(e.open)}
                >
                  <Collapsible.Trigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      w="100%"
                      justifyContent="space-between"
                      color="gray.300"
                      _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                    >
                      <Text fontSize="xs">Waveform Settings</Text>
                      <Text fontSize="xs">
                        {waveformSettingsOpen ? '−' : '+'}
                      </Text>
                    </Button>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <Box pt={2}>
                      <VStack gap={4} align="stretch">
                        {/* Waveform Settings */}
                        <Box>
                          <Text
                            fontSize="2xs"
                            color="gray.400"
                            mb={2}
                            fontWeight={600}
                          >
                            Settings
                          </Text>
                          <VStack gap={3} align="stretch" pl={2}>
                            <Field.Root>
                              <HStack justify="space-between" mb={2}>
                                <Field.Label fontSize="2xs" color="gray.500">
                                  Points
                                </Field.Label>
                                <Text fontSize="2xs" color="gray.500">
                                  {safeWaveformSettings.pointCount}
                                </Text>
                              </HStack>
                              <HStack gap={2} align="center" w="full">
                                <Box flex={1} w="full" minW={0}>
                                  <Slider.Root
                                    value={[safeWaveformSettings.pointCount]}
                                    onValueChange={(e) =>
                                      updateWaveformSetting(
                                        'pointCount',
                                        Math.round(e.value[0])
                                      )
                                    }
                                    min={0}
                                    max={512}
                                    step={1}
                                    size="sm"
                                    w="full"
                                  >
                                    <Slider.Control>
                                      <Slider.Track>
                                        <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                      </Slider.Track>
                                      <Slider.Thumbs />
                                    </Slider.Control>
                                  </Slider.Root>
                                </Box>
                                <NumberInput.Root
                                  value={safeWaveformSettings.pointCount.toString()}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'pointCount',
                                      Math.round(parseFloat(e.value) || 0)
                                    )
                                  }
                                  min={0}
                                  max={512}
                                  step={1}
                                  size="xs"
                                  w="70px"
                                >
                                  <NumberInput.Control />
                                  <NumberInput.Input
                                    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                    fontSize="2xs"
                                    bg="rgba(0, 0, 0, 0.3)"
                                    borderColor="rgba(255, 255, 255, 0.1)"
                                    color="gray.300"
                                  />
                                </NumberInput.Root>
                              </HStack>
                            </Field.Root>

                            <Field.Root>
                              <HStack justify="space-between" mb={2}>
                                <Field.Label fontSize="2xs" color="gray.500">
                                  Radius
                                </Field.Label>
                                <Text fontSize="2xs" color="gray.500">
                                  {Math.round(
                                    safeWaveformSettings.radius * 100
                                  )}
                                  %
                                </Text>
                              </HStack>
                              <HStack gap={2} align="center" w="full">
                                <Box flex={1} w="full" minW={0}>
                                  <Slider.Root
                                    value={[safeWaveformSettings.radius]}
                                    onValueChange={(e) =>
                                      updateWaveformSetting(
                                        'radius',
                                        e.value[0]
                                      )
                                    }
                                    min={0.01}
                                    max={0.5}
                                    step={0.01}
                                    size="sm"
                                    w="full"
                                  >
                                    <Slider.Control>
                                      <Slider.Track>
                                        <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                      </Slider.Track>
                                      <Slider.Thumbs />
                                    </Slider.Control>
                                  </Slider.Root>
                                </Box>
                                <NumberInput.Root
                                  value={safeWaveformSettings.radius.toFixed(2)}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'radius',
                                      parseFloat(e.value) || 0.01
                                    )
                                  }
                                  min={0.01}
                                  max={0.5}
                                  step={0.01}
                                  size="xs"
                                  w="70px"
                                >
                                  <NumberInput.Control />
                                  <NumberInput.Input
                                    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                    fontSize="2xs"
                                    bg="rgba(0, 0, 0, 0.3)"
                                    borderColor="rgba(255, 255, 255, 0.1)"
                                    color="gray.300"
                                  />
                                </NumberInput.Root>
                              </HStack>
                            </Field.Root>

                            <Field.Root>
                              <HStack justify="space-between" mb={2}>
                                <Field.Label fontSize="2xs" color="gray.500">
                                  Bar Width
                                </Field.Label>
                                <Text fontSize="2xs" color="gray.500">
                                  {safeWaveformSettings.barWidth.toFixed(3)}
                                </Text>
                              </HStack>
                              <HStack gap={2} align="center" w="full">
                                <Box flex={1} w="full" minW={0}>
                                  <Slider.Root
                                    value={[safeWaveformSettings.barWidth]}
                                    onValueChange={(e) =>
                                      updateWaveformSetting(
                                        'barWidth',
                                        e.value[0]
                                      )
                                    }
                                    min={0.001}
                                    max={0.1}
                                    step={0.001}
                                    size="sm"
                                    w="full"
                                  >
                                    <Slider.Control>
                                      <Slider.Track>
                                        <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                      </Slider.Track>
                                      <Slider.Thumbs />
                                    </Slider.Control>
                                  </Slider.Root>
                                </Box>
                                <NumberInput.Root
                                  value={safeWaveformSettings.barWidth.toFixed(
                                    3
                                  )}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'barWidth',
                                      parseFloat(e.value) || 0.001
                                    )
                                  }
                                  min={0.001}
                                  max={0.1}
                                  step={0.001}
                                  size="xs"
                                  w="70px"
                                >
                                  <NumberInput.Control />
                                  <NumberInput.Input
                                    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                    fontSize="2xs"
                                    bg="rgba(0, 0, 0, 0.3)"
                                    borderColor="rgba(255, 255, 255, 0.1)"
                                    color="gray.300"
                                  />
                                </NumberInput.Root>
                              </HStack>
                            </Field.Root>

                            <Field.Root>
                              <HStack justify="space-between" mb={2}>
                                <Field.Label fontSize="2xs" color="gray.500">
                                  Bar Length
                                </Field.Label>
                                <Text fontSize="2xs" color="gray.500">
                                  {Math.round(
                                    safeWaveformSettings.barLengthMultiplier *
                                      100
                                  )}
                                  %
                                </Text>
                              </HStack>
                              <HStack gap={2} align="center" w="full">
                                <Box flex={1} w="full" minW={0}>
                                  <Slider.Root
                                    value={[
                                      safeWaveformSettings.barLengthMultiplier,
                                    ]}
                                    onValueChange={(e) =>
                                      updateWaveformSetting(
                                        'barLengthMultiplier',
                                        e.value[0]
                                      )
                                    }
                                    min={0.01}
                                    max={1.0}
                                    step={0.01}
                                    size="sm"
                                    w="full"
                                  >
                                    <Slider.Control>
                                      <Slider.Track>
                                        <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                      </Slider.Track>
                                      <Slider.Thumbs />
                                    </Slider.Control>
                                  </Slider.Root>
                                </Box>
                                <NumberInput.Root
                                  value={safeWaveformSettings.barLengthMultiplier.toFixed(
                                    2
                                  )}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'barLengthMultiplier',
                                      parseFloat(e.value) || 0.01
                                    )
                                  }
                                  min={0.01}
                                  max={1.0}
                                  step={0.01}
                                  size="xs"
                                  w="70px"
                                >
                                  <NumberInput.Control />
                                  <NumberInput.Input
                                    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                    fontSize="2xs"
                                    bg="rgba(0, 0, 0, 0.3)"
                                    borderColor="rgba(255, 255, 255, 0.1)"
                                    color="gray.300"
                                  />
                                </NumberInput.Root>
                              </HStack>
                            </Field.Root>
                          </VStack>
                        </Box>

                        {/* Waveform Breathing */}
                        <Collapsible.Root
                          open={waveformBreathingOpen}
                          onOpenChange={(e) => setWaveformBreathingOpen(e.open)}
                        >
                          <Collapsible.Trigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              w="100%"
                              justifyContent="space-between"
                              color="gray.400"
                              _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                              fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                              fontSize="2xs"
                            >
                              <Text fontSize="2xs">Breathing</Text>
                              <Text fontSize="2xs">
                                {waveformBreathingOpen ? '−' : '+'}
                              </Text>
                            </Button>
                          </Collapsible.Trigger>
                          <Collapsible.Content>
                            <Box pt={2}>
                              <VStack gap={3} align="stretch">
                                <Switch.Root
                                  checked={
                                    safeWaveformSettings.breathingEnabled
                                  }
                                  onCheckedChange={(e) =>
                                    updateWaveformSetting(
                                      'breathingEnabled',
                                      e.checked === true
                                    )
                                  }
                                  size="sm"
                                >
                                  <Switch.HiddenInput />
                                  <Switch.Control>
                                    <Switch.Thumb />
                                  </Switch.Control>
                                  <Switch.Label fontSize="2xs" color="gray.500">
                                    Enabled
                                  </Switch.Label>
                                </Switch.Root>

                                {safeWaveformSettings.breathingEnabled && (
                                  <>
                                    <Field.Root>
                                      <HStack justify="space-between" mb={2}>
                                        <Field.Label
                                          fontSize="2xs"
                                          color="gray.500"
                                        >
                                          Speed
                                        </Field.Label>
                                        <Text fontSize="2xs" color="gray.500">
                                          {safeWaveformSettings.breathingSpeed.toFixed(
                                            3
                                          )}
                                        </Text>
                                      </HStack>
                                      <HStack gap={2} align="center" w="full">
                                        <Box flex={1} w="full" minW={0}>
                                          <Slider.Root
                                            value={[
                                              safeWaveformSettings.breathingSpeed,
                                            ]}
                                            onValueChange={(e) =>
                                              updateWaveformSetting(
                                                'breathingSpeed',
                                                e.value[0]
                                              )
                                            }
                                            min={0.005}
                                            max={0.1}
                                            step={0.005}
                                            size="sm"
                                            w="full"
                                          >
                                            <Slider.Control>
                                              <Slider.Track>
                                                <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                              </Slider.Track>
                                              <Slider.Thumbs />
                                            </Slider.Control>
                                          </Slider.Root>
                                        </Box>
                                        <NumberInput.Root
                                          value={safeWaveformSettings.breathingSpeed.toFixed(
                                            3
                                          )}
                                          onValueChange={(e) =>
                                            updateWaveformSetting(
                                              'breathingSpeed',
                                              parseFloat(e.value) || 0.005
                                            )
                                          }
                                          min={0.005}
                                          max={0.1}
                                          step={0.005}
                                          size="xs"
                                          w="70px"
                                        >
                                          <NumberInput.Control />
                                          <NumberInput.Input
                                            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                            fontSize="2xs"
                                            bg="rgba(0, 0, 0, 0.3)"
                                            borderColor="rgba(255, 255, 255, 0.1)"
                                            color="gray.300"
                                          />
                                        </NumberInput.Root>
                                      </HStack>
                                    </Field.Root>

                                    <Field.Root>
                                      <HStack justify="space-between" mb={2}>
                                        <Field.Label
                                          fontSize="2xs"
                                          color="gray.500"
                                        >
                                          Intensity
                                        </Field.Label>
                                        <Text fontSize="2xs" color="gray.500">
                                          {Math.round(
                                            safeWaveformSettings.breathingIntensity *
                                              100
                                          )}
                                          %
                                        </Text>
                                      </HStack>
                                      <HStack gap={2} align="center" w="full">
                                        <Box flex={1} w="full" minW={0}>
                                          <Slider.Root
                                            value={[
                                              safeWaveformSettings.breathingIntensity,
                                            ]}
                                            onValueChange={(e) =>
                                              updateWaveformSetting(
                                                'breathingIntensity',
                                                e.value[0]
                                              )
                                            }
                                            min={0}
                                            max={0.5}
                                            step={0.01}
                                            size="sm"
                                            w="full"
                                          >
                                            <Slider.Control>
                                              <Slider.Track>
                                                <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                              </Slider.Track>
                                              <Slider.Thumbs />
                                            </Slider.Control>
                                          </Slider.Root>
                                        </Box>
                                        <NumberInput.Root
                                          value={safeWaveformSettings.breathingIntensity.toFixed(
                                            2
                                          )}
                                          onValueChange={(e) =>
                                            updateWaveformSetting(
                                              'breathingIntensity',
                                              parseFloat(e.value) || 0
                                            )
                                          }
                                          min={0}
                                          max={0.5}
                                          step={0.01}
                                          size="xs"
                                          w="70px"
                                        >
                                          <NumberInput.Control />
                                          <NumberInput.Input
                                            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                            fontSize="2xs"
                                            bg="rgba(0, 0, 0, 0.3)"
                                            borderColor="rgba(255, 255, 255, 0.1)"
                                            color="gray.300"
                                          />
                                        </NumberInput.Root>
                                      </HStack>
                                    </Field.Root>
                                  </>
                                )}
                              </VStack>
                            </Box>
                          </Collapsible.Content>
                        </Collapsible.Root>

                        {/* Waveform Animation */}
                        <Collapsible.Root
                          open={waveformAnimationOpen}
                          onOpenChange={(e) => setWaveformAnimationOpen(e.open)}
                        >
                          <Collapsible.Trigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              w="100%"
                              justifyContent="space-between"
                              color="gray.400"
                              _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                              fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                              fontSize="2xs"
                            >
                              <Text fontSize="2xs">Animation</Text>
                              <Text fontSize="2xs">
                                {waveformAnimationOpen ? '−' : '+'}
                              </Text>
                            </Button>
                          </Collapsible.Trigger>
                          <Collapsible.Content>
                            <Box pt={2}>
                              <VStack gap={3} align="stretch">
                                <Field.Root>
                                  <HStack justify="space-between" mb={2}>
                                    <Field.Label
                                      fontSize="2xs"
                                      color="gray.500"
                                    >
                                      Base Speed
                                    </Field.Label>
                                    <Text fontSize="2xs" color="gray.500">
                                      {safeWaveformSettings.animationSpeed.toFixed(
                                        1
                                      )}
                                    </Text>
                                  </HStack>
                                  <HStack gap={2} align="center" w="full">
                                    <Box flex={1} w="full" minW={0}>
                                      <Slider.Root
                                        value={[
                                          safeWaveformSettings.animationSpeed,
                                        ]}
                                        onValueChange={(e) =>
                                          updateWaveformSetting(
                                            'animationSpeed',
                                            e.value[0]
                                          )
                                        }
                                        min={0.1}
                                        max={2.0}
                                        step={0.1}
                                        size="sm"
                                        w="full"
                                      >
                                        <Slider.Control>
                                          <Slider.Track>
                                            <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                          </Slider.Track>
                                          <Slider.Thumbs />
                                        </Slider.Control>
                                      </Slider.Root>
                                    </Box>
                                    <NumberInput.Root
                                      value={safeWaveformSettings.animationSpeed.toFixed(
                                        1
                                      )}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'animationSpeed',
                                          parseFloat(e.value) || 0.1
                                        )
                                      }
                                      min={0.1}
                                      max={2.0}
                                      step={0.1}
                                      size="xs"
                                      w="70px"
                                    >
                                      <NumberInput.Control />
                                      <NumberInput.Input
                                        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                        fontSize="2xs"
                                        bg="rgba(0, 0, 0, 0.3)"
                                        borderColor="rgba(255, 255, 255, 0.1)"
                                        color="gray.300"
                                      />
                                    </NumberInput.Root>
                                  </HStack>
                                </Field.Root>

                                <Field.Root>
                                  <HStack justify="space-between" mb={2}>
                                    <Field.Label
                                      fontSize="2xs"
                                      color="gray.500"
                                    >
                                      Irregular Speed
                                    </Field.Label>
                                    <Text fontSize="2xs" color="gray.500">
                                      {safeWaveformSettings.animationSpeedIrregular.toFixed(
                                        1
                                      )}
                                    </Text>
                                  </HStack>
                                  <HStack gap={2} align="center" w="full">
                                    <Box flex={1} w="full" minW={0}>
                                      <Slider.Root
                                        value={[
                                          safeWaveformSettings.animationSpeedIrregular,
                                        ]}
                                        onValueChange={(e) =>
                                          updateWaveformSetting(
                                            'animationSpeedIrregular',
                                            e.value[0]
                                          )
                                        }
                                        min={0.1}
                                        max={2.0}
                                        step={0.1}
                                        size="sm"
                                        w="full"
                                      >
                                        <Slider.Control>
                                          <Slider.Track>
                                            <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                          </Slider.Track>
                                          <Slider.Thumbs />
                                        </Slider.Control>
                                      </Slider.Root>
                                    </Box>
                                    <NumberInput.Root
                                      value={safeWaveformSettings.animationSpeedIrregular.toFixed(
                                        1
                                      )}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'animationSpeedIrregular',
                                          parseFloat(e.value) || 0.1
                                        )
                                      }
                                      min={0.1}
                                      max={2.0}
                                      step={0.1}
                                      size="xs"
                                      w="70px"
                                    >
                                      <NumberInput.Control />
                                      <NumberInput.Input
                                        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                        fontSize="2xs"
                                        bg="rgba(0, 0, 0, 0.3)"
                                        borderColor="rgba(255, 255, 255, 0.1)"
                                        color="gray.300"
                                      />
                                    </NumberInput.Root>
                                  </HStack>
                                </Field.Root>

                                <Field.Root>
                                  <HStack justify="space-between" mb={2}>
                                    <Field.Label
                                      fontSize="2xs"
                                      color="gray.500"
                                    >
                                      High Freq Speed
                                    </Field.Label>
                                    <Text fontSize="2xs" color="gray.500">
                                      {safeWaveformSettings.animationSpeedHighFreq.toFixed(
                                        1
                                      )}
                                    </Text>
                                  </HStack>
                                  <HStack gap={2} align="center" w="full">
                                    <Box flex={1} w="full" minW={0}>
                                      <Slider.Root
                                        value={[
                                          safeWaveformSettings.animationSpeedHighFreq,
                                        ]}
                                        onValueChange={(e) =>
                                          updateWaveformSetting(
                                            'animationSpeedHighFreq',
                                            e.value[0]
                                          )
                                        }
                                        min={0.1}
                                        max={2.0}
                                        step={0.1}
                                        size="sm"
                                        w="full"
                                      >
                                        <Slider.Control>
                                          <Slider.Track>
                                            <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                          </Slider.Track>
                                          <Slider.Thumbs />
                                        </Slider.Control>
                                      </Slider.Root>
                                    </Box>
                                    <NumberInput.Root
                                      value={safeWaveformSettings.animationSpeedHighFreq.toFixed(
                                        1
                                      )}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'animationSpeedHighFreq',
                                          parseFloat(e.value) || 0.1
                                        )
                                      }
                                      min={0.1}
                                      max={2.0}
                                      step={0.1}
                                      size="xs"
                                      w="70px"
                                    >
                                      <NumberInput.Control />
                                      <NumberInput.Input
                                        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                        fontSize="2xs"
                                        bg="rgba(0, 0, 0, 0.3)"
                                        borderColor="rgba(255, 255, 255, 0.1)"
                                        color="gray.300"
                                      />
                                    </NumberInput.Root>
                                  </HStack>
                                </Field.Root>
                              </VStack>
                            </Box>
                          </Collapsible.Content>
                        </Collapsible.Root>

                        {/* Waveform Amplitude */}
                        <Collapsible.Root
                          open={waveformAmplitudeOpen}
                          onOpenChange={(e) => setWaveformAmplitudeOpen(e.open)}
                        >
                          <Collapsible.Trigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              w="100%"
                              justifyContent="space-between"
                              color="gray.400"
                              _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                              fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                              fontSize="2xs"
                            >
                              <Text fontSize="2xs">Amplitude</Text>
                              <Text fontSize="2xs">
                                {waveformAmplitudeOpen ? '−' : '+'}
                              </Text>
                            </Button>
                          </Collapsible.Trigger>
                          <Collapsible.Content>
                            <Box pt={2}>
                              <VStack gap={3} align="stretch">
                                <Field.Root>
                                  <HStack justify="space-between" mb={2}>
                                    <Field.Label
                                      fontSize="2xs"
                                      color="gray.500"
                                    >
                                      Audio Power
                                    </Field.Label>
                                    <Text fontSize="2xs" color="gray.500">
                                      {safeWaveformSettings.amplitudePowerAudio.toFixed(
                                        2
                                      )}
                                    </Text>
                                  </HStack>
                                  <HStack gap={2} align="center" w="full">
                                    <Box flex={1} w="full" minW={0}>
                                      <Slider.Root
                                        value={[
                                          safeWaveformSettings.amplitudePowerAudio,
                                        ]}
                                        onValueChange={(e) =>
                                          updateWaveformSetting(
                                            'amplitudePowerAudio',
                                            e.value[0]
                                          )
                                        }
                                        min={0.1}
                                        max={1.5}
                                        step={0.05}
                                        size="sm"
                                        w="full"
                                      >
                                        <Slider.Control>
                                          <Slider.Track>
                                            <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                          </Slider.Track>
                                          <Slider.Thumbs />
                                        </Slider.Control>
                                      </Slider.Root>
                                    </Box>
                                    <NumberInput.Root
                                      value={safeWaveformSettings.amplitudePowerAudio.toFixed(
                                        2
                                      )}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'amplitudePowerAudio',
                                          parseFloat(e.value) || 0.1
                                        )
                                      }
                                      min={0.1}
                                      max={1.5}
                                      step={0.05}
                                      size="xs"
                                      w="70px"
                                    >
                                      <NumberInput.Control />
                                      <NumberInput.Input
                                        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                        fontSize="2xs"
                                        bg="rgba(0, 0, 0, 0.3)"
                                        borderColor="rgba(255, 255, 255, 0.1)"
                                        color="gray.300"
                                      />
                                    </NumberInput.Root>
                                  </HStack>
                                </Field.Root>

                                <Field.Root>
                                  <HStack justify="space-between" mb={2}>
                                    <Field.Label
                                      fontSize="2xs"
                                      color="gray.500"
                                    >
                                      Synthetic Power
                                    </Field.Label>
                                    <Text fontSize="2xs" color="gray.500">
                                      {safeWaveformSettings.amplitudePowerSynthetic.toFixed(
                                        2
                                      )}
                                    </Text>
                                  </HStack>
                                  <HStack gap={2} align="center" w="full">
                                    <Box flex={1} w="full" minW={0}>
                                      <Slider.Root
                                        value={[
                                          safeWaveformSettings.amplitudePowerSynthetic,
                                        ]}
                                        onValueChange={(e) =>
                                          updateWaveformSetting(
                                            'amplitudePowerSynthetic',
                                            e.value[0]
                                          )
                                        }
                                        min={0.1}
                                        max={1.5}
                                        step={0.05}
                                        size="sm"
                                        w="full"
                                      >
                                        <Slider.Control>
                                          <Slider.Track>
                                            <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                          </Slider.Track>
                                          <Slider.Thumbs />
                                        </Slider.Control>
                                      </Slider.Root>
                                    </Box>
                                    <NumberInput.Root
                                      value={safeWaveformSettings.amplitudePowerSynthetic.toFixed(
                                        2
                                      )}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'amplitudePowerSynthetic',
                                          parseFloat(e.value) || 0.1
                                        )
                                      }
                                      min={0.1}
                                      max={1.5}
                                      step={0.05}
                                      size="xs"
                                      w="70px"
                                    >
                                      <NumberInput.Control />
                                      <NumberInput.Input
                                        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                        fontSize="2xs"
                                        bg="rgba(0, 0, 0, 0.3)"
                                        borderColor="rgba(255, 255, 255, 0.1)"
                                        color="gray.300"
                                      />
                                    </NumberInput.Root>
                                  </HStack>
                                </Field.Root>
                              </VStack>
                            </Box>
                          </Collapsible.Content>
                        </Collapsible.Root>

                        {/* Waveform Glow */}
                        <Collapsible.Root
                          open={waveformGlowOpen}
                          onOpenChange={(e) => setWaveformGlowOpen(e.open)}
                        >
                          <Collapsible.Trigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              w="100%"
                              justifyContent="space-between"
                              color="gray.400"
                              _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                              fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                              fontSize="2xs"
                            >
                              <Text fontSize="2xs">Glow</Text>
                              <Text fontSize="2xs">
                                {waveformGlowOpen ? '−' : '+'}
                              </Text>
                            </Button>
                          </Collapsible.Trigger>
                          <Collapsible.Content>
                            <Box pt={2}>
                              <VStack gap={3} align="stretch">
                                <Field.Root>
                                  <HStack justify="space-between" mb={2}>
                                    <Field.Label
                                      fontSize="2xs"
                                      color="gray.500"
                                    >
                                      Base Opacity
                                    </Field.Label>
                                    <Text fontSize="2xs" color="gray.500">
                                      {safeWaveformSettings.glowOpacityBase.toFixed(
                                        2
                                      )}
                                    </Text>
                                  </HStack>
                                  <HStack gap={2} align="center" w="full">
                                    <Box flex={1} w="full" minW={0}>
                                      <Slider.Root
                                        value={[
                                          safeWaveformSettings.glowOpacityBase,
                                        ]}
                                        onValueChange={(e) =>
                                          updateWaveformSetting(
                                            'glowOpacityBase',
                                            e.value[0]
                                          )
                                        }
                                        min={0}
                                        max={0.5}
                                        step={0.01}
                                        size="sm"
                                        w="full"
                                      >
                                        <Slider.Control>
                                          <Slider.Track>
                                            <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                          </Slider.Track>
                                          <Slider.Thumbs />
                                        </Slider.Control>
                                      </Slider.Root>
                                    </Box>
                                    <NumberInput.Root
                                      value={safeWaveformSettings.glowOpacityBase.toFixed(
                                        2
                                      )}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'glowOpacityBase',
                                          parseFloat(e.value) || 0
                                        )
                                      }
                                      min={0}
                                      max={0.5}
                                      step={0.01}
                                      size="xs"
                                      w="70px"
                                    >
                                      <NumberInput.Control />
                                      <NumberInput.Input
                                        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                        fontSize="2xs"
                                        bg="rgba(0, 0, 0, 0.3)"
                                        borderColor="rgba(255, 255, 255, 0.1)"
                                        color="gray.300"
                                      />
                                    </NumberInput.Root>
                                  </HStack>
                                </Field.Root>

                                <Field.Root>
                                  <HStack justify="space-between" mb={2}>
                                    <Field.Label
                                      fontSize="2xs"
                                      color="gray.500"
                                    >
                                      Opacity Range
                                    </Field.Label>
                                    <Text fontSize="2xs" color="gray.500">
                                      {safeWaveformSettings.glowOpacityRange.toFixed(
                                        2
                                      )}
                                    </Text>
                                  </HStack>
                                  <HStack gap={2} align="center" w="full">
                                    <Box flex={1} w="full" minW={0}>
                                      <Slider.Root
                                        value={[
                                          safeWaveformSettings.glowOpacityRange,
                                        ]}
                                        onValueChange={(e) =>
                                          updateWaveformSetting(
                                            'glowOpacityRange',
                                            e.value[0]
                                          )
                                        }
                                        min={0}
                                        max={0.2}
                                        step={0.01}
                                        size="sm"
                                        w="full"
                                      >
                                        <Slider.Control>
                                          <Slider.Track>
                                            <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                          </Slider.Track>
                                          <Slider.Thumbs />
                                        </Slider.Control>
                                      </Slider.Root>
                                    </Box>
                                    <NumberInput.Root
                                      value={safeWaveformSettings.glowOpacityRange.toFixed(
                                        2
                                      )}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'glowOpacityRange',
                                          parseFloat(e.value) || 0
                                        )
                                      }
                                      min={0}
                                      max={0.2}
                                      step={0.01}
                                      size="xs"
                                      w="70px"
                                    >
                                      <NumberInput.Control />
                                      <NumberInput.Input
                                        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                        fontSize="2xs"
                                        bg="rgba(0, 0, 0, 0.3)"
                                        borderColor="rgba(255, 255, 255, 0.1)"
                                        color="gray.300"
                                      />
                                    </NumberInput.Root>
                                  </HStack>
                                </Field.Root>
                              </VStack>
                            </Box>
                          </Collapsible.Content>
                        </Collapsible.Root>

                        {/* Waveform Layers */}
                        <Collapsible.Root
                          open={waveformLayersOpen}
                          onOpenChange={(e) => setWaveformLayersOpen(e.open)}
                        >
                          <Collapsible.Trigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              w="100%"
                              justifyContent="space-between"
                              color="gray.400"
                              _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                              fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                              fontSize="2xs"
                            >
                              <Text fontSize="2xs">
                                Layers ({waveformLayers.length})
                              </Text>
                              <Text fontSize="2xs">
                                {waveformLayersOpen ? '−' : '+'}
                              </Text>
                            </Button>
                          </Collapsible.Trigger>
                          <Collapsible.Content>
                            <Box pt={2}>
                              <VStack gap={2} align="stretch">
                                {waveformLayers.map((layer, index) => {
                                  const isExpanded = expandedLayers.has(
                                    layer.id
                                  );
                                  return (
                                    <Box
                                      key={layer.id}
                                      border="1px solid"
                                      borderColor="rgba(255, 255, 255, 0.1)"
                                      borderRadius="sm"
                                      p={2}
                                    >
                                      <HStack
                                        justify="space-between"
                                        mb={isExpanded ? 2 : 0}
                                      >
                                        <Button
                                          variant="ghost"
                                          size="xs"
                                          onClick={() =>
                                            toggleLayerExpanded(layer.id)
                                          }
                                          color="gray.400"
                                          _hover={{
                                            bg: 'rgba(255, 255, 255, 0.03)',
                                          }}
                                          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                          fontSize="2xs"
                                        >
                                          <Text fontSize="2xs">
                                            Layer {index + 1}{' '}
                                            {isExpanded ? '−' : '+'}
                                          </Text>
                                        </Button>
                                        {waveformLayers.length > 1 && (
                                          <IconButton
                                            aria-label="Remove layer"
                                            size="xs"
                                            variant="ghost"
                                            colorPalette="red"
                                            onClick={() =>
                                              removeWaveformLayer(layer.id)
                                            }
                                          >
                                            <HiTrash />
                                          </IconButton>
                                        )}
                                      </HStack>
                                      {isExpanded && (
                                        <VStack gap={2} align="stretch" mt={2}>
                                          <Field.Root>
                                            <Field.Label
                                              fontSize="2xs"
                                              color="gray.500"
                                              mb={1}
                                            >
                                              Color
                                            </Field.Label>
                                            <HStack gap={2}>
                                              <Input
                                                type="color"
                                                value={layer.color}
                                                onChange={(e) =>
                                                  updateWaveformLayer(
                                                    layer.id,
                                                    {
                                                      color: e.target.value,
                                                    }
                                                  )
                                                }
                                                w="50px"
                                                h="24px"
                                                p={0}
                                                border="1px solid"
                                                borderColor="rgba(255, 255, 255, 0.1)"
                                                borderRadius="sm"
                                                cursor="pointer"
                                              />
                                              <Input
                                                type="text"
                                                value={layer.color.toUpperCase()}
                                                onChange={(e) => {
                                                  const hex = e.target.value;
                                                  if (
                                                    /^#[0-9A-Fa-f]{6}$/.test(
                                                      hex
                                                    )
                                                  ) {
                                                    updateWaveformLayer(
                                                      layer.id,
                                                      {
                                                        color: hex,
                                                      }
                                                    );
                                                  }
                                                }}
                                                size="xs"
                                                fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                                bg="rgba(0, 0, 0, 0.3)"
                                                borderColor="rgba(255, 255, 255, 0.1)"
                                                color="gray.400"
                                                flex={1}
                                              />
                                            </HStack>
                                          </Field.Root>

                                          <Field.Root>
                                            <HStack
                                              justify="space-between"
                                              mb={2}
                                            >
                                              <Field.Label
                                                fontSize="2xs"
                                                color="gray.500"
                                              >
                                                Offset
                                              </Field.Label>
                                              <Text
                                                fontSize="2xs"
                                                color="gray.500"
                                              >
                                                {layer.offset.toFixed(2)}
                                              </Text>
                                            </HStack>
                                            <HStack
                                              gap={2}
                                              align="center"
                                              w="full"
                                            >
                                              <Box flex={1} w="full" minW={0}>
                                                <Slider.Root
                                                  value={[layer.offset]}
                                                  onValueChange={(e) =>
                                                    updateWaveformLayer(
                                                      layer.id,
                                                      {
                                                        offset: e.value[0],
                                                      }
                                                    )
                                                  }
                                                  min={0}
                                                  max={0.5}
                                                  step={0.01}
                                                  size="sm"
                                                  w="full"
                                                >
                                                  <Slider.Control>
                                                    <Slider.Track>
                                                      <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                                    </Slider.Track>
                                                    <Slider.Thumbs />
                                                  </Slider.Control>
                                                </Slider.Root>
                                              </Box>
                                              <NumberInput.Root
                                                value={layer.offset.toFixed(2)}
                                                onValueChange={(e) =>
                                                  updateWaveformLayer(
                                                    layer.id,
                                                    {
                                                      offset:
                                                        parseFloat(e.value) ||
                                                        0,
                                                    }
                                                  )
                                                }
                                                min={0}
                                                max={0.5}
                                                step={0.01}
                                                size="xs"
                                                w="70px"
                                              >
                                                <NumberInput.Control />
                                                <NumberInput.Input
                                                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                                  fontSize="2xs"
                                                  bg="rgba(0, 0, 0, 0.3)"
                                                  borderColor="rgba(255, 255, 255, 0.1)"
                                                  color="gray.300"
                                                />
                                              </NumberInput.Root>
                                            </HStack>
                                          </Field.Root>

                                          <Field.Root>
                                            <HStack
                                              justify="space-between"
                                              mb={2}
                                            >
                                              <Field.Label
                                                fontSize="2xs"
                                                color="gray.500"
                                              >
                                                Amplitude
                                              </Field.Label>
                                              <Text
                                                fontSize="2xs"
                                                color="gray.500"
                                              >
                                                {layer.amplitude.toFixed(2)}
                                              </Text>
                                            </HStack>
                                            <HStack
                                              gap={2}
                                              align="center"
                                              w="full"
                                            >
                                              <Box flex={1} w="full" minW={0}>
                                                <Slider.Root
                                                  value={[layer.amplitude]}
                                                  onValueChange={(e) =>
                                                    updateWaveformLayer(
                                                      layer.id,
                                                      {
                                                        amplitude: e.value[0],
                                                      }
                                                    )
                                                  }
                                                  min={0}
                                                  max={1}
                                                  step={0.01}
                                                  size="sm"
                                                  w="full"
                                                >
                                                  <Slider.Control>
                                                    <Slider.Track>
                                                      <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                                    </Slider.Track>
                                                    <Slider.Thumbs />
                                                  </Slider.Control>
                                                </Slider.Root>
                                              </Box>
                                              <NumberInput.Root
                                                value={layer.amplitude.toFixed(
                                                  2
                                                )}
                                                onValueChange={(e) =>
                                                  updateWaveformLayer(
                                                    layer.id,
                                                    {
                                                      amplitude:
                                                        parseFloat(e.value) ||
                                                        0,
                                                    }
                                                  )
                                                }
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                size="xs"
                                                w="70px"
                                              >
                                                <NumberInput.Control />
                                                <NumberInput.Input
                                                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                                  fontSize="2xs"
                                                  bg="rgba(0, 0, 0, 0.3)"
                                                  borderColor="rgba(255, 255, 255, 0.1)"
                                                  color="gray.300"
                                                />
                                              </NumberInput.Root>
                                            </HStack>
                                          </Field.Root>

                                          <Field.Root>
                                            <HStack
                                              justify="space-between"
                                              mb={2}
                                            >
                                              <Field.Label
                                                fontSize="2xs"
                                                color="gray.500"
                                              >
                                                Frequency
                                              </Field.Label>
                                              <Text
                                                fontSize="2xs"
                                                color="gray.500"
                                              >
                                                {layer.frequency.toFixed(1)}
                                              </Text>
                                            </HStack>
                                            <HStack
                                              gap={2}
                                              align="center"
                                              w="full"
                                            >
                                              <Box flex={1} w="full" minW={0}>
                                                <Slider.Root
                                                  value={[layer.frequency]}
                                                  onValueChange={(e) =>
                                                    updateWaveformLayer(
                                                      layer.id,
                                                      {
                                                        frequency: e.value[0],
                                                      }
                                                    )
                                                  }
                                                  min={1}
                                                  max={6}
                                                  step={0.1}
                                                  size="sm"
                                                  w="full"
                                                >
                                                  <Slider.Control>
                                                    <Slider.Track>
                                                      <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                                    </Slider.Track>
                                                    <Slider.Thumbs />
                                                  </Slider.Control>
                                                </Slider.Root>
                                              </Box>
                                              <NumberInput.Root
                                                value={layer.frequency.toFixed(
                                                  1
                                                )}
                                                onValueChange={(e) =>
                                                  updateWaveformLayer(
                                                    layer.id,
                                                    {
                                                      frequency:
                                                        parseFloat(e.value) ||
                                                        1,
                                                    }
                                                  )
                                                }
                                                min={1}
                                                max={6}
                                                step={0.1}
                                                size="xs"
                                                w="70px"
                                              >
                                                <NumberInput.Control />
                                                <NumberInput.Input
                                                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                                  fontSize="2xs"
                                                  bg="rgba(0, 0, 0, 0.3)"
                                                  borderColor="rgba(255, 255, 255, 0.1)"
                                                  color="gray.300"
                                                />
                                              </NumberInput.Root>
                                            </HStack>
                                          </Field.Root>

                                          <Field.Root>
                                            <HStack
                                              justify="space-between"
                                              mb={2}
                                            >
                                              <Field.Label
                                                fontSize="2xs"
                                                color="gray.500"
                                              >
                                                Phase
                                              </Field.Label>
                                              <Text
                                                fontSize="2xs"
                                                color="gray.500"
                                              >
                                                {(
                                                  layer.phase / Math.PI
                                                ).toFixed(1)}
                                                π
                                              </Text>
                                            </HStack>
                                            <HStack
                                              gap={2}
                                              align="center"
                                              w="full"
                                            >
                                              <Box flex={1} w="full" minW={0}>
                                                <Slider.Root
                                                  value={[layer.phase]}
                                                  onValueChange={(e) =>
                                                    updateWaveformLayer(
                                                      layer.id,
                                                      {
                                                        phase: e.value[0],
                                                      }
                                                    )
                                                  }
                                                  min={0}
                                                  max={Math.PI * 2}
                                                  step={0.01}
                                                  size="sm"
                                                  w="full"
                                                >
                                                  <Slider.Control>
                                                    <Slider.Track>
                                                      <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                                                    </Slider.Track>
                                                    <Slider.Thumbs />
                                                  </Slider.Control>
                                                </Slider.Root>
                                              </Box>
                                              <NumberInput.Root
                                                value={(
                                                  layer.phase / Math.PI
                                                ).toFixed(2)}
                                                onValueChange={(e) =>
                                                  updateWaveformLayer(
                                                    layer.id,
                                                    {
                                                      phase:
                                                        parseFloat(e.value) *
                                                          Math.PI || 0,
                                                    }
                                                  )
                                                }
                                                min={0}
                                                max={2}
                                                step={0.01}
                                                size="xs"
                                                w="70px"
                                              >
                                                <NumberInput.Control />
                                                <NumberInput.Input
                                                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                                  fontSize="2xs"
                                                  bg="rgba(0, 0, 0, 0.3)"
                                                  borderColor="rgba(255, 255, 255, 0.1)"
                                                  color="gray.300"
                                                />
                                              </NumberInput.Root>
                                            </HStack>
                                          </Field.Root>
                                        </VStack>
                                      )}
                                    </Box>
                                  );
                                })}
                                <Button
                                  size="xs"
                                  variant="outline"
                                  colorPalette="gray"
                                  onClick={addWaveformLayer}
                                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                                  fontSize="2xs"
                                >
                                  <HiPlus />
                                  Add Layer
                                </Button>
                              </VStack>
                            </Box>
                          </Collapsible.Content>
                        </Collapsible.Root>
                      </VStack>
                    </Box>
                  </Collapsible.Content>
                </Collapsible.Root>
              </>
            )}

            {/* Background Section */}
            <Text
              fontSize="sm"
              fontWeight={600}
              color="white"
              letterSpacing="0.1em"
              mt={waveformSettings ? 2 : 0}
              mb={2}
            >
              BACKGROUND
            </Text>

            {/* Hypnotic Background Controls */}
            {currentBackgroundType === 'hypnotic' && (
              <HypnoticControls
                hypnoticSettings={hypnoticSettings}
                updateSetting={updateSetting}
                applyTheme={applyTheme}
                matchesTheme={matchesTheme}
                updateColor={updateColor}
                intensityOpen={intensityOpen}
                onIntensityOpenChange={setIntensityOpen}
                breathingOpen={breathingOpen}
                onBreathingOpenChange={setBreathingOpen}
                particlesOpen={particlesOpen}
                onParticlesOpenChange={setParticlesOpen}
                colorsOpen={colorsOpen}
                onColorsOpenChange={setColorsOpen}
                rotationOpen={rotationOpen}
                onRotationOpenChange={setRotationOpen}
              />
            )}

            {/* Dither Background Controls */}
            {currentBackgroundType === 'dither' && (
              <DitherControls
                open={ditherOpen}
                onOpenChange={setDitherOpen}
                settings={settings}
                onSettingChange={updateDitherSetting}
              />
            )}

            {/* Waves Background Controls */}
            {currentBackgroundType === 'waves' && (
              <WavesControls
                open={wavesOpen}
                onOpenChange={setWavesOpen}
                settings={settings}
                onSettingChange={updateWavesSetting}
              />
            )}

            {/* PixelBlast Background Controls */}
            {currentBackgroundType === 'pixelblast' && (
              <PixelBlastControls
                open={pixelblastOpen}
                onOpenChange={setPixelblastOpen}
                settings={settings}
                onSettingChange={updatePixelblastSetting}
              />
            )}

            {/* Orb Background Controls */}
            {currentBackgroundType === 'orb' && (
              <OrbControls
                open={orbOpen}
                onOpenChange={setOrbOpen}
                settings={settings}
                onSettingChange={updateOrbSetting}
              />
            )}

            {/* Threads Background Controls */}
            {currentBackgroundType === 'threads' && (
              <ThreadsControls
                open={threadsOpen}
                onOpenChange={setThreadsOpen}
                settings={settings}
                onSettingChange={updateThreadsSetting}
              />
            )}

            {/* Pulsar Background Controls */}
            {currentBackgroundType === 'pulsar' && (
              <PulsarControls
                open={pulsarOpen}
                onOpenChange={setPulsarOpen}
                settings={settings}
                onSettingChange={updatePulsarSetting}
              />
            )}

            {/* Seele Background Controls */}
            {currentBackgroundType === 'seele' && (
              <SeeleControls
                open={seeleOpen}
                onOpenChange={setSeeleOpen}
                settings={settings}
                onSettingChange={updateSeeleSetting}
                onSettingsChange={onSettingsChange}
              />
            )}

            {/* Color Background Controls */}
            {currentBackgroundType === 'color' && (
              <ColorControls
                open={colorOpen}
                onOpenChange={setColorOpen}
                settings={settings}
                onSettingChange={updateColorSetting}
              />
            )}

            {/* Image Dither Background Controls */}
            {currentBackgroundType === 'imagedither' && (
              <ImageDitherControls
                open={imageditherOpen}
                onOpenChange={setImageditherOpen}
                settings={settings}
                onSettingChange={updateImageDitherSetting}
                fileInputRef={imageDitherFileInputRef}
                onFileChange={handleImageDitherFileChange}
              />
            )}
          </VStack>
        </Box>
      )}
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when props actually change
export const BackgroundControlPanel = memo(BackgroundControlPanelComponent);
