/**
 * Background control panel. Composes all background-type sections and owns shared settings state. The public props and re-exports (`WaveformLayer`, `WaveformSettings`) are the stable entry point for consumers.
 *
 * @module background/BackgroundControlPanel.tsx
 */
import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
import { DEFAULT_SYSTEM_TEXT } from '@/components/animations/systemTextAnimation';
import type {
  BackgroundSettings,
  BackgroundType,
  SystemTextAnimationSettings,
  SystemVisualizationSettings,
  SystemVisualizationSourceId,
} from '@/lib/settings-types';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from 'react';
// (chevron icons no longer needed — panel is always expanded when shown)
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
import { WaveformSection } from './panels/WaveformSection';
import type { WaveformLayer, WaveformSettings } from './panels/waveformTypes';
import { hexToRgb, rgbToHex, type ThemePreset } from './backgroundControlUtils';

export type { WaveformLayer, WaveformSettings } from './panels/waveformTypes';

/** Static font stack; hoisted so Emotion sees a stable value across renders. */
const PANEL_FONT_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace";

/** Static scrollbar styles; hoisted to avoid Emotion css-object churn. */
const SCROLLBAR_CSS = {
  '&::-webkit-scrollbar': { width: '8px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    '&:hover': { background: 'rgba(255, 255, 255, 0.25)' },
  },
  '&::-webkit-scrollbar-corner': { background: 'transparent' },
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
  overscrollBehavior: 'contain',
  transform: 'translateZ(0)',
} as const;

/** Static responsive position/size values shared by the panel shell. */
const PANEL_POSITION_PROPS = {
  position: 'fixed',
  right: { base: 2, sm: 4 },
  top: { base: 2, sm: 4 },
  bottom: { base: 2, sm: 4 },
  w: { base: 'calc(100vw - 1rem)', sm: '320px', md: '360px' },
  maxW: 'calc(100vw - 1rem)',
  maxH: 'calc(100dvh - 1rem)',
} as const;

/**
 * Memoized section wrappers: toggling one collapsible re-renders only that
 * section instead of the whole panel subtree.
 */
const MemoBackgroundTypeSelector = memo(BackgroundTypeSelector);
const MemoSystemTextSection = memo(SystemTextSection);
const MemoSystemVisualizationSection = memo(SystemVisualizationSection);
const MemoHypnoticControls = memo(HypnoticControls);
const MemoDitherControls = memo(DitherControls);
const MemoWavesControls = memo(WavesControls);
const MemoPixelBlastControls = memo(PixelBlastControls);
const MemoOrbControls = memo(OrbControls);
const MemoThreadsControls = memo(ThreadsControls);
const MemoPulsarControls = memo(PulsarControls);
const MemoSeeleControls = memo(SeeleControls);
const MemoColorControls = memo(ColorControls);
const MemoImageDitherControls = memo(ImageDitherControls);

interface BackgroundControlPanelProps {
  readonly settings: BackgroundSettings;
  readonly onSettingsChange: (settings: BackgroundSettings) => void;
  readonly waveformLayers?: WaveformLayer[];
  readonly onWaveformLayersChange?: (layers: WaveformLayer[]) => void;
  readonly waveformSettings?: WaveformSettings;
  readonly onWaveformSettingsChange?: (settings: WaveformSettings) => void;
  readonly onLocalWaveformSettingsChange?: (settings: WaveformSettings) => void;
  readonly waveformEnabled?: boolean;
  readonly onWaveformEnabledChange?: (enabled: boolean) => void;
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
}: BackgroundControlPanelProps): JSX.Element => {
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

  const [systemTextOpen, setSystemTextOpen] = useState(false);
  const [systemVisualizationOpen, setSystemVisualizationOpen] = useState(false);

  // The panel's visibility is controlled by the parent (InterlocutorChat)
  // via backgroundControlsOpen + BackgroundControlsToggle. There is no
  // second, internal collapse layer: that created a confusing nested
  // "click to unhide the button that unhides the control panel" workflow.
  // The panel is always fully expanded when shown.

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

  // Memoized hypnotic settings (from top-level or nested hypnotic property for backward compatibility)
  const hypnoticSettings: HypnoticBackgroundSettings | undefined =
    useMemo(() => {
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
          tertiaryColor1:
            settings.tertiaryColor1 ?? defaultColors.tertiaryColor1,
          tertiaryColor2:
            settings.tertiaryColor2 ?? defaultColors.tertiaryColor2,
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
    }, [settings]);

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

  const applyTheme = useCallback(
    (theme: ThemePreset): void => {
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
    },
    [onSettingsChange, settings]
  );

  // Check if current settings match a theme (with tolerance for floating point precision)
  const matchesTheme = useCallback(
    (theme: ThemePreset): boolean => {
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
    },
    [hypnoticSettings]
  );

  return (
    <Box
      {...PANEL_POSITION_PROPS}
      boxSizing="border-box"
      bg="rgba(0, 0, 0, 0.6)"
      backdropFilter="blur(8px)"
      border="1px solid"
      borderColor="rgba(255, 255, 255, 0.1)"
      borderRadius="md"
      p={{ base: 3, sm: 4 }}
      overflowY="auto"
      overflowX="hidden"
      fontFamily={PANEL_FONT_FAMILY}
      fontSize="xs"
      zIndex={1000}
      css={SCROLLBAR_CSS}
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
        </HStack>

        <MemoBackgroundTypeSelector
          settings={settings}
          onSettingsChange={onSettingsChange}
          currentBackgroundType={currentBackgroundType}
          onBackgroundTypeChange={updateBackgroundType}
        />

        <MemoSystemTextSection
          open={systemTextOpen}
          onOpenChange={setSystemTextOpen}
          systemText={safeSystemText}
          onSystemTextChange={updateSystemText}
        />

        <MemoSystemVisualizationSection
          open={systemVisualizationOpen}
          onOpenChange={setSystemVisualizationOpen}
          settings={settings}
          onSourceChange={updateSystemVisualizationSource}
          onCycleChange={updateCycleSystemVisualizations}
          onCycleDurationChange={updateSystemVisualizationCycleDuration}
          onSystemVisualizationChange={updateSystemVisualization}
          onSystemVisualizationTypesChange={updateSystemVisualizationTypes}
        />

        <WaveformSection
          waveformLayers={waveformLayers}
          onWaveformLayersChange={onWaveformLayersChange}
          waveformSettings={waveformSettings}
          onWaveformSettingsChange={onWaveformSettingsChange}
          onLocalWaveformSettingsChange={onLocalWaveformSettingsChange}
          waveformEnabled={waveformEnabled}
          onWaveformEnabledChange={onWaveformEnabledChange}
        />

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
          <MemoHypnoticControls
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
          <MemoDitherControls
            open={ditherOpen}
            onOpenChange={setDitherOpen}
            settings={settings}
            onSettingChange={updateDitherSetting}
          />
        )}

        {/* Waves Background Controls */}
        {currentBackgroundType === 'waves' && (
          <MemoWavesControls
            open={wavesOpen}
            onOpenChange={setWavesOpen}
            settings={settings}
            onSettingChange={updateWavesSetting}
          />
        )}

        {/* PixelBlast Background Controls */}
        {currentBackgroundType === 'pixelblast' && (
          <MemoPixelBlastControls
            open={pixelblastOpen}
            onOpenChange={setPixelblastOpen}
            settings={settings}
            onSettingChange={updatePixelblastSetting}
          />
        )}

        {/* Orb Background Controls */}
        {currentBackgroundType === 'orb' && (
          <MemoOrbControls
            open={orbOpen}
            onOpenChange={setOrbOpen}
            settings={settings}
            onSettingChange={updateOrbSetting}
          />
        )}

        {/* Threads Background Controls */}
        {currentBackgroundType === 'threads' && (
          <MemoThreadsControls
            open={threadsOpen}
            onOpenChange={setThreadsOpen}
            settings={settings}
            onSettingChange={updateThreadsSetting}
          />
        )}

        {/* Pulsar Background Controls */}
        {currentBackgroundType === 'pulsar' && (
          <MemoPulsarControls
            open={pulsarOpen}
            onOpenChange={setPulsarOpen}
            settings={settings}
            onSettingChange={updatePulsarSetting}
          />
        )}

        {/* Seele Background Controls */}
        {currentBackgroundType === 'seele' && (
          <MemoSeeleControls
            open={seeleOpen}
            onOpenChange={setSeeleOpen}
            settings={settings}
            onSettingChange={updateSeeleSetting}
            onSettingsChange={onSettingsChange}
          />
        )}

        {/* Color Background Controls */}
        {currentBackgroundType === 'color' && (
          <MemoColorControls
            open={colorOpen}
            onOpenChange={setColorOpen}
            settings={settings}
            onSettingChange={updateColorSetting}
          />
        )}

        {/* Image Dither Background Controls */}
        {currentBackgroundType === 'imagedither' && (
          <MemoImageDitherControls
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
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when props actually change
export const BackgroundControlPanel = memo(BackgroundControlPanelComponent);
