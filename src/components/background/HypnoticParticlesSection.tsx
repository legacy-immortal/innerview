/**
 * @file Hypnotic particle controls (count and opacity).
 * @module background/HypnoticParticlesSection
 */
// Hypnotic particles collapsible (extracted from HypnoticControls.tsx).
import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
import { memo, type JSX } from 'react';
import { Switch, VStack } from '@chakra-ui/react';
import { CollapsibleSection, SliderField } from './controlFields';

export interface HypnoticParticlesSectionProps {
  readonly hypnoticSettings: HypnoticBackgroundSettings | undefined;
  readonly updateSetting: <K extends keyof HypnoticBackgroundSettings>(
    key: K,
    value: HypnoticBackgroundSettings[K]
  ) => void;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function HypnoticParticlesSectionComponent({
  hypnoticSettings,
  updateSetting,
  open,
  onOpenChange,
}: HypnoticParticlesSectionProps): JSX.Element {
  return (
    <CollapsibleSection
      title="Particles"
      open={open}
      onOpenChange={onOpenChange}
    >
      <VStack gap={3} align="stretch">
        <Switch.Root
          checked={hypnoticSettings?.particlesEnabled ?? false}
          onCheckedChange={(e) =>
            updateSetting('particlesEnabled', e.checked === true)
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

        {hypnoticSettings?.particlesEnabled && (
          <>
            <SliderField
              label="Count"
              display={String(hypnoticSettings?.particlesCount ?? 50)}
              value={hypnoticSettings?.particlesCount ?? 50}
              min={0}
              max={20}
              step={1}
              onValueChange={(v) =>
                updateSetting('particlesCount', Math.round(v))
              }
              numberValue={(hypnoticSettings?.particlesCount ?? 50).toString()}
              onNumberValueChange={(s) =>
                updateSetting('particlesCount', Math.round(parseFloat(s) || 0))
              }
            />
            <SliderField
              label="Opacity"
              display={`${Math.round((hypnoticSettings?.particlesOpacity ?? 0.5) * 100)}%`}
              value={hypnoticSettings?.particlesOpacity ?? 0.5}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(v) => updateSetting('particlesOpacity', v)}
              numberValue={(hypnoticSettings?.particlesOpacity ?? 0.5).toFixed(
                2
              )}
              onNumberValueChange={(s) =>
                updateSetting('particlesOpacity', parseFloat(s) || 0)
              }
            />
          </>
        )}
      </VStack>
    </CollapsibleSection>
  );
}

/** Hypnotic particle controls: enable toggle, count, and opacity sliders. */
export const HypnoticParticlesSection = memo(HypnoticParticlesSectionComponent);
