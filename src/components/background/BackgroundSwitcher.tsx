import { Color } from '@/components/animations/Color';
import Dither from '@/components/animations/Dither';
import { Hypnotic } from '@/components/animations/Hypnotic';
import ImageDither from '@/components/animations/ImageDither';
import Orb from '@/components/animations/Orb';
import PixelBlast from '@/components/animations/PixelBlast';
import Pulsar from '@/components/animations/Pulsar';
import Seele from '@/components/animations/Seele';
import Threads from '@/components/animations/Threads';
import Waves from '@/components/animations/Waves';
import { useSettingsStore } from '@/lib/settings-store';
import type { BackgroundSettings } from '@/lib/settings-types';
import { Box } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

// Delay in ms to allow WebGL context cleanup before mounting new animation
const TRANSITION_DELAY_MS = 100;

interface BackgroundSwitcherProps {
  settings: BackgroundSettings;
}

export const BackgroundSwitcher = ({ settings }: BackgroundSwitcherProps) => {
  const performanceSettings = useSettingsStore(
    useShallow((state) => state.settings?.performance ?? null)
  );

  // Track the current animation type and manage graceful transitions
  const [activeType, setActiveType] = useState<string | undefined>(
    settings.type
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousTypeRef = useRef<string | undefined>(settings.type);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Handle animation type changes with a transition delay
  // This allows the previous WebGL context to be properly disposed
  useEffect(() => {
    const newType = settings.type;

    // Only trigger transition if the type actually changed
    if (newType !== previousTypeRef.current) {
      // Clear any pending transition
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      // Begin transition - unmount current animation
      setIsTransitioning(true);
      setActiveType(undefined);

      // After delay, mount the new animation
      transitionTimeoutRef.current = setTimeout(() => {
        setActiveType(newType);
        setIsTransitioning(false);
        previousTypeRef.current = newType;
        transitionTimeoutRef.current = null;
      }, TRANSITION_DELAY_MS);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [settings.type]);

  // Ensure activeType stays in sync if somehow it gets out of sync
  // (this shouldn't normally happen, but provides a safety net)
  const effectiveActiveType =
    isTransitioning || activeType === undefined ? undefined : activeType;

  // Don't render background if animations are disabled
  if (
    !performanceSettings?.backgroundAnimationsEnabled ||
    performanceSettings?.maxBackgroundComplexity === 'minimal'
  ) {
    return null;
  }

  // Apply performance optimizations to settings
  const applyPerformanceOptimizations = (
    backgroundSettings: BackgroundSettings
  ): BackgroundSettings => {
    if (!performanceSettings) return backgroundSettings;

    const complexity = performanceSettings.maxBackgroundComplexity;
    const maxParticles = performanceSettings.maxParticles;

    // Optimize based on complexity level
    if (complexity === 'simple') {
      // Reduce particle counts and disable expensive features
      if (backgroundSettings.type === 'hypnotic') {
        return {
          ...backgroundSettings,
          particlesEnabled: false,
          breathingEnabled: false,
          rotationSpeed1: (backgroundSettings.rotationSpeed1 ?? 0.1) * 0.5,
          rotationSpeed2: (backgroundSettings.rotationSpeed2 ?? 0.1) * 0.5,
          rotationSpeed3: (backgroundSettings.rotationSpeed3 ?? 0.1) * 0.5,
        };
      }
    }

    // Apply particle limits
    if (
      backgroundSettings.type === 'hypnotic' &&
      backgroundSettings.particlesEnabled
    ) {
      return {
        ...backgroundSettings,
        particlesCount: Math.min(
          backgroundSettings.particlesCount ?? 50,
          maxParticles
        ),
      };
    }

    return backgroundSettings;
  };

  const optimizedSettings = applyPerformanceOptimizations(settings);
  const backgroundOpacity = optimizedSettings.opacity ?? 0.3;

  // Don't render during transition or if no active type
  if (!effectiveActiveType) {
    return null;
  }

  const renderBackground = () => {
    switch (effectiveActiveType) {
      case 'hypnotic': {
        // Use top-level properties if available, otherwise fall back to nested hypnotic property
        const hypnoticSettings =
          optimizedSettings.intensity !== undefined
            ? {
                intensity: optimizedSettings.intensity!,
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
              }
            : optimizedSettings.hypnotic;
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <Hypnotic settings={hypnoticSettings} />
          </Box>
        );
      }
      case 'dither':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <Dither
              waveSpeed={optimizedSettings.dither?.waveSpeed}
              waveFrequency={optimizedSettings.dither?.waveFrequency}
              waveAmplitude={optimizedSettings.dither?.waveAmplitude}
              waveColor={
                optimizedSettings.dither?.waveColor
                  ? ([
                      ...(optimizedSettings.dither.waveColor
                        .replace('#', '')
                        .match(/.{2}/g) || []),
                    ]
                      .map((x) => parseInt(x, 16) / 255)
                      .slice(0, 3) as [number, number, number])
                  : undefined
              }
              enableMouseInteraction={
                performanceSettings?.maxBackgroundComplexity === 'full'
                  ? optimizedSettings.dither?.enableMouseInteraction
                  : false
              }
              mouseRadius={optimizedSettings.dither?.mouseRadius}
            />
          </Box>
        );
      case 'waves':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <Waves
              waveSpeedX={optimizedSettings.waves?.speed}
              waveSpeedY={optimizedSettings.waves?.speed}
              waveAmpX={optimizedSettings.waves?.amplitude}
              waveAmpY={optimizedSettings.waves?.amplitude}
              lineColor={optimizedSettings.waves?.color}
              enableMouseInteraction={
                performanceSettings?.maxBackgroundComplexity === 'full'
                  ? (optimizedSettings.waves?.enableMouseInteraction ?? false)
                  : false
              }
              xGap={optimizedSettings.waves?.xGap}
              yGap={optimizedSettings.waves?.yGap}
              reverseX={optimizedSettings.waves?.reverseX ?? false}
              reverseY={optimizedSettings.waves?.reverseY ?? false}
            />
          </Box>
        );
      case 'pixelblast':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <PixelBlast
              variant={optimizedSettings.pixelblast?.variant}
              pixelSize={optimizedSettings.pixelblast?.pixelSize}
              color={optimizedSettings.pixelblast?.color}
              patternScale={optimizedSettings.pixelblast?.patternScale}
              patternDensity={optimizedSettings.pixelblast?.patternDensity}
              liquid={
                performanceSettings?.maxBackgroundComplexity === 'full'
                  ? optimizedSettings.pixelblast?.liquid
                  : false
              }
              liquidStrength={optimizedSettings.pixelblast?.liquidStrength}
              speed={optimizedSettings.pixelblast?.speed}
            />
          </Box>
        );
      case 'orb':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity={backgroundOpacity}
          >
            <Orb
              hue={optimizedSettings.orb?.hue}
              hoverIntensity={optimizedSettings.orb?.hoverIntensity}
              rotateOnHover={
                performanceSettings?.maxBackgroundComplexity === 'full'
                  ? optimizedSettings.orb?.rotateOnHover
                  : false
              }
            />
          </Box>
        );
      case 'threads':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <Threads
              color={optimizedSettings.threads?.color}
              amplitude={optimizedSettings.threads?.amplitude}
              distance={optimizedSettings.threads?.distance}
              enableMouseInteraction={
                performanceSettings?.maxBackgroundComplexity === 'full'
                  ? optimizedSettings.threads?.enableMouseInteraction
                  : false
              }
            />
          </Box>
        );
      case 'pulsar':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <Pulsar
              settings={{
                lineSpacing: optimizedSettings.pulsar?.lineSpacing ?? 0.13,
                lineColor: optimizedSettings.pulsar?.lineColor ?? '#ffffff',
                bgColor: optimizedSettings.pulsar?.bgColor ?? '#000000',
                rotationX: optimizedSettings.pulsar?.rotationX ?? 0.49,
                rotationY: optimizedSettings.pulsar?.rotationY ?? 0,
                scale: optimizedSettings.pulsar?.scale ?? 0.78,
                verticalScale: optimizedSettings.pulsar?.verticalScale ?? 0.03,
                animationSpeed: optimizedSettings.pulsar?.animationSpeed ?? 0.2,
              }}
            />
          </Box>
        );
      case 'seele':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <Seele
              settings={{
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
              }}
            />
          </Box>
        );
      case 'color':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <Color
              settings={{
                color: optimizedSettings.color?.color,
                gradientEnabled: optimizedSettings.color?.gradientEnabled,
                gradientColor: optimizedSettings.color?.gradientColor,
                gradientDirection: optimizedSettings.color?.gradientDirection,
                scanlineEnabled: optimizedSettings.color?.scanlineEnabled,
                scanlineOpacity: optimizedSettings.color?.scanlineOpacity,
                scanlineSpeed: optimizedSettings.color?.scanlineSpeed,
                scanlineColor: optimizedSettings.color?.scanlineColor,
              }}
            />
          </Box>
        );
      case 'imagedither':
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <ImageDither
              settings={{
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
              }}
            />
          </Box>
        );
      default: {
        // Use top-level properties if available, otherwise fall back to nested hypnotic property
        const hypnoticSettings =
          optimizedSettings.intensity !== undefined
            ? {
                intensity: optimizedSettings.intensity!,
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
              }
            : optimizedSettings.hypnotic;
        return (
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            zIndex={0}
            pointerEvents="none"
            opacity={backgroundOpacity}
          >
            <Hypnotic settings={hypnoticSettings} />
          </Box>
        );
      }
    }
  };

  return <>{renderBackground()}</>;
};
