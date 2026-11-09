/**
 * Hypnotic intensity controls (base intensity and falloff).
 *
 * @module background/HypnoticIntensitySection.tsx
 */
// Hypnotic intensity collapsible (extracted from HypnoticControls.tsx).
import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
import { CollapsibleSection, SliderField } from './controlFields';

export interface HypnoticIntensitySectionProps {
  readonly hypnoticSettings: HypnoticBackgroundSettings | undefined;
  readonly updateSetting: <K extends keyof HypnoticBackgroundSettings>(
    key: K,
    value: HypnoticBackgroundSettings[K]
  ) => void;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function HypnoticIntensitySection({
  hypnoticSettings,
  updateSetting,
  open,
  onOpenChange,
}: HypnoticIntensitySectionProps): JSX.Element {
  return (
    <CollapsibleSection
      title="Intensity"
      open={open}
      onOpenChange={onOpenChange}
    >
      <SliderField
        label="Intensity"
        display={`${hypnoticSettings ? Math.round(hypnoticSettings.intensity * 100) : 0}%`}
        value={hypnoticSettings?.intensity ?? 0.5}
        min={0}
        max={1}
        step={0.01}
        onValueChange={(v) => updateSetting('intensity', v)}
        numberValue={(hypnoticSettings?.intensity ?? 0.5).toFixed(2)}
        onNumberValueChange={(s) =>
          updateSetting('intensity', parseFloat(s) || 0)
        }
      />
    </CollapsibleSection>
  );
}
import type { JSX } from 'react';
