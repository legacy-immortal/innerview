/**
 * @file Hypnotic breathing controls (toggle, speed, and intensity).
 * @module background/HypnoticBreathingSection
 */
// Hypnotic breathing collapsible (extracted from HypnoticControls.tsx).
import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
import { memo, type JSX } from 'react';
import { Switch, VStack } from '@chakra-ui/react';
import { CollapsibleSection, SliderField } from './controlFields';

export interface HypnoticBreathingSectionProps {
  readonly hypnoticSettings: HypnoticBackgroundSettings | undefined;
  readonly updateSetting: <K extends keyof HypnoticBackgroundSettings>(
    key: K,
    value: HypnoticBackgroundSettings[K]
  ) => void;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function HypnoticBreathingSectionComponent({
  hypnoticSettings,
  updateSetting,
  open,
  onOpenChange,
}: HypnoticBreathingSectionProps): JSX.Element {
  return (
    <CollapsibleSection
      title="Breathing"
      open={open}
      onOpenChange={onOpenChange}
    >
      <VStack gap={3} align="stretch">
        <Switch.Root
          checked={hypnoticSettings?.breathingEnabled ?? false}
          onCheckedChange={(e) =>
            updateSetting('breathingEnabled', e.checked === true)
          }
          size="sm"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label fontSize="xs" color="gray.400">
            Enabled
          </Switch.Label>
        </Switch.Root>

        {hypnoticSettings?.breathingEnabled && (
          <>
            <SliderField
              label="Speed"
              display={(hypnoticSettings?.breathingSpeed ?? 0.02).toFixed(1)}
              value={hypnoticSettings?.breathingSpeed ?? 0.02}
              min={0.1}
              max={2.0}
              step={0.1}
              onValueChange={(v) => updateSetting('breathingSpeed', v)}
              numberValue={(hypnoticSettings?.breathingSpeed ?? 0.02).toFixed(
                1
              )}
              onNumberValueChange={(s) =>
                updateSetting('breathingSpeed', parseFloat(s) || 0.1)
              }
            />
            <SliderField
              label="Intensity"
              display={`${Math.round((hypnoticSettings?.breathingIntensity ?? 0.1) * 100)}%`}
              value={hypnoticSettings?.breathingIntensity ?? 0.1}
              min={0}
              max={0.5}
              step={0.01}
              onValueChange={(v) => updateSetting('breathingIntensity', v)}
              numberValue={(
                hypnoticSettings?.breathingIntensity ?? 0.1
              ).toFixed(2)}
              onNumberValueChange={(s) =>
                updateSetting('breathingIntensity', parseFloat(s) || 0)
              }
            />
          </>
        )}
      </VStack>
    </CollapsibleSection>
  );
}

/** Hypnotic breathing controls: enable toggle, speed, and intensity sliders. */
export const HypnoticBreathingSection = memo(HypnoticBreathingSectionComponent);
