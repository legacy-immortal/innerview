/**
 * @file Hypnotic rotation controls (per-layer rotation speeds).
 * @module background/HypnoticRotationSection
 */
// Hypnotic rotation collapsible (extracted from HypnoticControls.tsx).
import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
import { memo, type JSX } from 'react';
import { VStack } from '@chakra-ui/react';
import { CollapsibleSection, SliderField } from './controlFields';

const ROTATION_FIELDS = [
  ['Primary Layer Speed', 'rotationSpeed1'],
  ['Secondary Layer Speed', 'rotationSpeed2'],
  ['Tertiary Layer Speed', 'rotationSpeed3'],
] as const;

export interface HypnoticRotationSectionProps {
  readonly hypnoticSettings: HypnoticBackgroundSettings | undefined;
  readonly updateSetting: <K extends keyof HypnoticBackgroundSettings>(
    key: K,
    value: HypnoticBackgroundSettings[K]
  ) => void;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function HypnoticRotationSectionComponent({
  hypnoticSettings,
  updateSetting,
  open,
  onOpenChange,
}: HypnoticRotationSectionProps): JSX.Element {
  return (
    <CollapsibleSection
      title="Rotation"
      open={open}
      onOpenChange={onOpenChange}
    >
      <VStack gap={3} align="stretch">
        {ROTATION_FIELDS.map(([label, key]) => (
          <SliderField
            key={key}
            label={label}
            display={(hypnoticSettings?.[key] ?? 0.1).toFixed(4)}
            value={hypnoticSettings?.[key] ?? 0.1}
            min={0}
            max={0.5}
            step={0.001}
            onValueChange={(v) => updateSetting(key, v)}
            numberValue={(hypnoticSettings?.[key] ?? 0.1).toFixed(4)}
            onNumberValueChange={(s) => updateSetting(key, parseFloat(s) || 0)}
          />
        ))}
      </VStack>
    </CollapsibleSection>
  );
}

/** Hypnotic rotation controls: per-layer rotation speed sliders. */
export const HypnoticRotationSection = memo(HypnoticRotationSectionComponent);
