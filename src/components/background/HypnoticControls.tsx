/**
 * Hypnotic background controls. Composes the hypnotic sub-sections.
 *
 * @module background/HypnoticControls.tsx
 */
import type { JSX } from 'react';
import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
import type { ThemePreset } from './backgroundControlUtils';
import { HypnoticBreathingSection } from './HypnoticBreathingSection';
import { HypnoticColorsSection } from './HypnoticColorsSection';
import { HypnoticIntensitySection } from './HypnoticIntensitySection';
import { HypnoticParticlesSection } from './HypnoticParticlesSection';
import { HypnoticRotationSection } from './HypnoticRotationSection';

export type HypnoticColorKey =
  | 'primaryColor1'
  | 'primaryColor2'
  | 'secondaryColor1'
  | 'secondaryColor2'
  | 'tertiaryColor1'
  | 'tertiaryColor2';

export interface HypnoticControlsProps {
  readonly hypnoticSettings: HypnoticBackgroundSettings | undefined;
  readonly updateSetting: <K extends keyof HypnoticBackgroundSettings>(
    key: K,
    value: HypnoticBackgroundSettings[K]
  ) => void;
  readonly applyTheme: (theme: ThemePreset) => void;
  readonly matchesTheme: (theme: ThemePreset) => boolean;
  readonly updateColor: (key: HypnoticColorKey, value: string) => void;
  readonly intensityOpen: boolean;
  readonly onIntensityOpenChange: (open: boolean) => void;
  readonly breathingOpen: boolean;
  readonly onBreathingOpenChange: (open: boolean) => void;
  readonly particlesOpen: boolean;
  readonly onParticlesOpenChange: (open: boolean) => void;
  readonly colorsOpen: boolean;
  readonly onColorsOpenChange: (open: boolean) => void;
  readonly rotationOpen: boolean;
  readonly onRotationOpenChange: (open: boolean) => void;
}

export function HypnoticControls({
  hypnoticSettings,
  updateSetting,
  applyTheme,
  matchesTheme,
  updateColor,
  intensityOpen,
  onIntensityOpenChange,
  breathingOpen,
  onBreathingOpenChange,
  particlesOpen,
  onParticlesOpenChange,
  colorsOpen,
  onColorsOpenChange,
  rotationOpen,
  onRotationOpenChange,
}: HypnoticControlsProps): JSX.Element {
  return (
    <>
      <HypnoticIntensitySection
        hypnoticSettings={hypnoticSettings}
        updateSetting={updateSetting}
        open={intensityOpen}
        onOpenChange={onIntensityOpenChange}
      />
      <HypnoticBreathingSection
        hypnoticSettings={hypnoticSettings}
        updateSetting={updateSetting}
        open={breathingOpen}
        onOpenChange={onBreathingOpenChange}
      />
      <HypnoticParticlesSection
        hypnoticSettings={hypnoticSettings}
        updateSetting={updateSetting}
        open={particlesOpen}
        onOpenChange={onParticlesOpenChange}
      />
      <HypnoticColorsSection
        hypnoticSettings={hypnoticSettings}
        applyTheme={applyTheme}
        matchesTheme={matchesTheme}
        updateColor={updateColor}
        open={colorsOpen}
        onOpenChange={onColorsOpenChange}
      />
      <HypnoticRotationSection
        hypnoticSettings={hypnoticSettings}
        updateSetting={updateSetting}
        open={rotationOpen}
        onOpenChange={onRotationOpenChange}
      />
    </>
  );
}
