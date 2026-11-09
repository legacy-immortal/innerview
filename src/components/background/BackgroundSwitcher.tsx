/**
 * Background switcher. Renders the active background animation for the current settings.
 *
 * Performance:
 * - Only the active background is mounted and only its code chunk is loaded
 *   (`React.lazy`); inactive ("offscreen") backgrounds are not imported or rendered.
 * - The mounted animation is keyed by type only, so prop/opacity tweaks update
 *   in place instead of tearing down and recreating the canvas/WebGL context.
 * - A single wrapper owns opacity, so there is exactly one compositing layer
 *   instead of one translucent layer per branch.
 * - `reducedMotion` / `lowPowerMode` (store flag or OS `prefers-reduced-motion`)
 *   disable the animation entirely.
 *
 * @module background/BackgroundSwitcher.tsx
 */
import type { HypnoticBackgroundSettings } from '@/components/animations/hypnotic/types';
import type { BackgroundSettings } from '@/lib/settings-types';
import { useSettingsStore } from '@/lib/settings-store';
import { Box } from '@chakra-ui/react';
import {
  Suspense,
  lazy,
  memo,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import { useShallow } from 'zustand/react/shallow';

// Lazy-load each background so only the active chunk is fetched. Inactive
// types are never imported, keeping offscreen backgrounds off the main thread.
const Hypnotic = lazy(() =>
  import('@/components/animations/Hypnotic').then((m) => ({
    default: m.Hypnotic,
  }))
);
const Dither = lazy(() => import('@/components/animations/Dither'));
const Waves = lazy(() => import('@/components/animations/Waves'));
const PixelBlast = lazy(() => import('@/components/animations/PixelBlast'));
const Orb = lazy(() => import('@/components/animations/Orb'));
const Threads = lazy(() => import('@/components/animations/Threads'));
const Pulsar = lazy(() => import('@/components/animations/Pulsar'));
const Seele = lazy(() => import('@/components/animations/Seele'));
const Color = lazy(() =>
  import('@/components/animations/Color').then((m) => ({ default: m.Color }))
);
const ImageDither = lazy(() => import('@/components/animations/ImageDither'));

interface BackgroundSwitcherProps {
  readonly settings: BackgroundSettings;
}

/** Single compositing layer: owns opacity + containment for every background. */
const BackgroundFrame = memo(function BackgroundFrame({
  opacity,
  centered = false,
  children,
}: {
  readonly opacity: number;
  readonly centered?: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      zIndex={0}
      pointerEvents="none"
      overflow="hidden"
      boxSizing="border-box"
      {...(centered
        ? { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        : {})}
      style={{
        opacity,
        contain: 'strict',
        touchAction: 'none',
        willChange: 'transform',
        isolation: 'isolate',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </Box>
  );
});

/** Track the OS-level `prefers-reduced-motion` media query. */
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (): void => setPrefersReduced(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return prefersReduced;
}

/** Parse a `#rrggbb` hex color into an `[r, g, b]` tuple (0–1). */
function parseHexColor(
  hex: string | undefined
): [number, number, number] | undefined {
  if (!hex) return undefined;
  const rgb = hex.replace('#', '').match(/.{2}/g);
  if (!rgb || rgb.length < 3) return undefined;
  return rgb.slice(0, 3).map((v) => parseInt(v, 16) / 255) as [
    number,
    number,
    number,
  ];
}

/** Shallow-compare settings so unrelated prop identity churn (new object, same fields) skips re-render/remount. */
function areSettingsEqual(
  prev: BackgroundSwitcherProps,
  next: BackgroundSwitcherProps
): boolean {
  if (prev.settings === next.settings) return true;
  const a = prev.settings as unknown as Record<string, unknown>;
  const b = next.settings as unknown as Record<string, unknown>;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => Object.is(a[k], b[k]));
}

export const BackgroundSwitcher = memo(function BackgroundSwitcher({
  settings,
}: BackgroundSwitcherProps): JSX.Element | null {
  const performanceSettings = useSettingsStore(
    useShallow((state) => state.settings?.performance ?? null)
  );
  const osReducedMotion = usePrefersReducedMotion();

  const reducedMotion = performanceSettings?.reducedMotion ?? false;
  const lowPowerMode = performanceSettings?.lowPowerMode ?? false;
  const complexity = performanceSettings?.maxBackgroundComplexity ?? 'simple';
  // Interactive effects (mouse, liquid, hover) only on full-fidelity, non-low-power.
  const interactiveEnabled =
    complexity === 'full' && !lowPowerMode && !reducedMotion;

  const disabled =
    !performanceSettings?.backgroundAnimationsEnabled ||
    complexity === 'minimal' ||
    reducedMotion ||
    lowPowerMode ||
    osReducedMotion;

  const activeType = settings.type;

  const optimizedSettings = useMemo<BackgroundSettings>(() => {
    const maxParticles = performanceSettings?.maxParticles ?? 50;
    const cap = lowPowerMode ? Math.min(maxParticles, 20) : maxParticles;

    if (settings.type === 'hypnotic') {
      const simple = complexity === 'simple' || lowPowerMode;
      return {
        ...settings,
        ...(simple
          ? {
              particlesEnabled: false,
              breathingEnabled: false,
              rotationSpeed1: (settings.rotationSpeed1 ?? 0.1) * 0.5,
              rotationSpeed2: (settings.rotationSpeed2 ?? 0.1) * 0.5,
              rotationSpeed3: (settings.rotationSpeed3 ?? 0.1) * 0.5,
            }
          : {}),
        ...(settings.particlesEnabled
          ? {
              particlesCount: Math.min(settings.particlesCount ?? 50, cap),
            }
          : {}),
      };
    }
    return settings;
  }, [settings, complexity, lowPowerMode, performanceSettings?.maxParticles]);

  const backgroundOpacity = optimizedSettings.opacity ?? 0.3;

  const hypnoticSettings = useMemo<
    HypnoticBackgroundSettings | undefined
  >(() => {
    if (optimizedSettings.intensity === undefined) {
      return optimizedSettings.hypnotic;
    }
    return {
      intensity: optimizedSettings.intensity,
      primaryColor1: optimizedSettings.primaryColor1!,
      primaryColor2: optimizedSettings.primaryColor2!,
      secondaryColor1: optimizedSettings.secondaryColor1!,
      secondaryColor2: optimizedSettings.secondaryColor2!,
      tertiaryColor1: optimizedSettings.tertiaryColor1!,
      tertiaryColor2: optimizedSettings.tertiaryColor2!,
      breathingEnabled: optimizedSettings.breathingEnabled ?? false,
      breathingSpeed: optimizedSettings.breathingSpeed ?? 0.02,
      breathingIntensity: optimizedSettings.breathingIntensity ?? 0.1,
      particlesEnabled: optimizedSettings.particlesEnabled ?? false,
      particlesCount: optimizedSettings.particlesCount ?? 50,
      particlesOpacity: optimizedSettings.particlesOpacity ?? 0.5,
      rotationSpeed1: optimizedSettings.rotationSpeed1 ?? 0.1,
      rotationSpeed2: optimizedSettings.rotationSpeed2 ?? 0.1,
      rotationSpeed3: optimizedSettings.rotationSpeed3 ?? 0.1,
    };
  }, [optimizedSettings]);

  const ditherWaveColor = useMemo(
    () => parseHexColor(optimizedSettings.dither?.waveColor),
    [optimizedSettings.dither?.waveColor]
  );

  const pulsarSettings = useMemo(
    () => ({
      lineSpacing: optimizedSettings.pulsar?.lineSpacing ?? 0.13,
      lineColor: optimizedSettings.pulsar?.lineColor ?? '#ffffff',
      bgColor: optimizedSettings.pulsar?.bgColor ?? '#000000',
      rotationX: optimizedSettings.pulsar?.rotationX ?? 0.49,
      rotationY: optimizedSettings.pulsar?.rotationY ?? 0,
      scale: optimizedSettings.pulsar?.scale ?? 0.78,
      verticalScale: optimizedSettings.pulsar?.verticalScale ?? 0.03,
      animationSpeed: optimizedSettings.pulsar?.animationSpeed ?? 0.2,
    }),
    [optimizedSettings.pulsar]
  );

  const seeleSettings = useMemo(
    () => ({
      textColor: optimizedSettings.seele?.textColor,
      bgColor: optimizedSettings.seele?.bgColor,
      topText: optimizedSettings.seele?.topText,
      bottomText: optimizedSettings.seele?.bottomText,
      numberSize: optimizedSettings.seele?.numberSize,
      labelSize: optimizedSettings.seele?.labelSize,
      pulseSpeed: optimizedSettings.seele?.pulseSpeed,
      pulseIntensity: optimizedSettings.seele?.pulseIntensity,
      scanlineSpeed: optimizedSettings.seele?.scanlineSpeed,
      scanlineOpacity: optimizedSettings.seele?.scanlineOpacity,
      scanlineColor: optimizedSettings.seele?.scanlineColor,
      showNumber: optimizedSettings.seele?.showNumber,
      seeleNumber: optimizedSettings.seele?.seeleNumber,
    }),
    [optimizedSettings.seele]
  );

  const colorSettings = useMemo(
    () => ({
      color: optimizedSettings.color?.color,
      gradientEnabled: optimizedSettings.color?.gradientEnabled,
      gradientColor: optimizedSettings.color?.gradientColor,
      gradientDirection: optimizedSettings.color?.gradientDirection,
      scanlineEnabled: optimizedSettings.color?.scanlineEnabled,
      scanlineOpacity: optimizedSettings.color?.scanlineOpacity,
      scanlineSpeed: optimizedSettings.color?.scanlineSpeed,
      scanlineColor: optimizedSettings.color?.scanlineColor,
    }),
    [optimizedSettings.color]
  );

  const imageDitherSettings = useMemo(
    () => ({
      image: optimizedSettings.imagedither?.image,
      type: optimizedSettings.imagedither?.type,
      pxSize: optimizedSettings.imagedither?.pxSize,
      colorSteps: optimizedSettings.imagedither?.colorSteps,
      originalColors: optimizedSettings.imagedither?.originalColors,
      colorFront: optimizedSettings.imagedither?.colorFront,
      colorBack: optimizedSettings.imagedither?.colorBack,
      colorHighlight: optimizedSettings.imagedither?.colorHighlight,
      scale: optimizedSettings.imagedither?.scale,
      rotation: optimizedSettings.imagedither?.rotation,
      offsetX: optimizedSettings.imagedither?.offsetX,
      offsetY: optimizedSettings.imagedither?.offsetY,
      fit: optimizedSettings.imagedither?.fit,
    }),
    [optimizedSettings.imagedither]
  );

  // Keyed by type only: same-type tweaks update props in place (no remount),
  // a type switch mounts exactly one new lazy chunk.
  // Memoized so parent re-renders don't rebuild the element tree / remount canvas.
  // (Hook must run before the disabled early-return below.)
  const content = useMemo<JSX.Element | null>(() => {
    switch (activeType) {
      case 'hypnotic':
      case undefined:
        return <Hypnotic settings={hypnoticSettings} />;
      case 'dither':
        return (
          <Dither
            waveSpeed={optimizedSettings.dither?.waveSpeed}
            waveFrequency={optimizedSettings.dither?.waveFrequency}
            waveAmplitude={optimizedSettings.dither?.waveAmplitude}
            waveColor={ditherWaveColor}
            enableMouseInteraction={
              interactiveEnabled
                ? optimizedSettings.dither?.enableMouseInteraction
                : false
            }
            mouseRadius={optimizedSettings.dither?.mouseRadius}
          />
        );
      case 'waves':
        return (
          <Waves
            waveSpeedX={optimizedSettings.waves?.speed}
            waveSpeedY={optimizedSettings.waves?.speed}
            waveAmpX={optimizedSettings.waves?.amplitude}
            waveAmpY={optimizedSettings.waves?.amplitude}
            lineColor={optimizedSettings.waves?.color}
            enableMouseInteraction={
              interactiveEnabled
                ? (optimizedSettings.waves?.enableMouseInteraction ?? false)
                : false
            }
            xGap={optimizedSettings.waves?.xGap}
            yGap={optimizedSettings.waves?.yGap}
            reverseX={optimizedSettings.waves?.reverseX ?? false}
            reverseY={optimizedSettings.waves?.reverseY ?? false}
          />
        );
      case 'pixelblast':
        return (
          <PixelBlast
            variant={optimizedSettings.pixelblast?.variant}
            pixelSize={optimizedSettings.pixelblast?.pixelSize}
            color={optimizedSettings.pixelblast?.color}
            patternScale={optimizedSettings.pixelblast?.patternScale}
            patternDensity={optimizedSettings.pixelblast?.patternDensity}
            liquid={
              interactiveEnabled ? optimizedSettings.pixelblast?.liquid : false
            }
            liquidStrength={optimizedSettings.pixelblast?.liquidStrength}
            speed={optimizedSettings.pixelblast?.speed}
          />
        );
      case 'orb':
        return (
          <Orb
            hue={optimizedSettings.orb?.hue}
            hoverIntensity={optimizedSettings.orb?.hoverIntensity}
            rotateOnHover={
              interactiveEnabled ? optimizedSettings.orb?.rotateOnHover : false
            }
          />
        );
      case 'threads':
        return (
          <Threads
            color={optimizedSettings.threads?.color}
            amplitude={optimizedSettings.threads?.amplitude}
            distance={optimizedSettings.threads?.distance}
            enableMouseInteraction={
              interactiveEnabled
                ? optimizedSettings.threads?.enableMouseInteraction
                : false
            }
          />
        );
      case 'pulsar':
        return <Pulsar settings={pulsarSettings} />;
      case 'seele':
        return <Seele settings={seeleSettings} />;
      case 'color':
        return <Color settings={colorSettings} />;
      case 'imagedither':
        return <ImageDither settings={imageDitherSettings} />;
      default:
        return <Hypnotic settings={hypnoticSettings} />;
    }
  }, [
    activeType,
    hypnoticSettings,
    optimizedSettings,
    ditherWaveColor,
    interactiveEnabled,
    pulsarSettings,
    seeleSettings,
    colorSettings,
    imageDitherSettings,
  ]);

  // Honor reduced motion / low power: render nothing animated.
  if (disabled) {
    return null;
  }

  return (
    <BackgroundFrame
      key={activeType}
      opacity={backgroundOpacity}
      centered={activeType === 'orb'}
    >
      <Suspense fallback={null}>{content}</Suspense>
    </BackgroundFrame>
  );
}, areSettingsEqual);
