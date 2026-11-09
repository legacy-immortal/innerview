/**
 * SEELE pulse controls (pulse speed, intensity, and number visibility).
 *
 * @module background/SeelePulseSection.tsx
 */
// SEELE pulse/number fields (extracted from SeeleControls.tsx).
import type { BackgroundSettings } from '@/lib/settings-types';
import { Field, HStack, Switch } from '@chakra-ui/react';
import { SliderField, SliderOnlyField } from './controlFields';

type SeeleSlice = NonNullable<BackgroundSettings['seele']>;

export interface SeelePulseSectionProps {
  readonly settings: BackgroundSettings;
  readonly onSettingChange: <K extends keyof SeeleSlice>(
    key: K,
    value: SeeleSlice[K]
  ) => void;
}

export function SeelePulseSection({
  settings,
  onSettingChange,
}: SeelePulseSectionProps): JSX.Element {
  return (
    <>
      <SliderField
        label="Pulse Speed"
        display={(settings.seele?.pulseSpeed ?? 2).toFixed(1)}
        value={settings.seele?.pulseSpeed ?? 2}
        min={0.5}
        max={5.0}
        step={0.1}
        rangeBg="rgba(255, 0, 0, 0.5)"
        onValueChange={(v) => onSettingChange('pulseSpeed', v)}
        numberValue={(settings.seele?.pulseSpeed ?? 2).toFixed(1)}
        onNumberValueChange={(s) =>
          onSettingChange('pulseSpeed', parseFloat(s) || 2)
        }
      />
      <SliderOnlyField
        label="Pulse Intensity"
        display={`${((settings.seele?.pulseIntensity ?? 0.1) * 100).toFixed(0)}%`}
        value={settings.seele?.pulseIntensity ?? 0.1}
        min={0.0}
        max={0.5}
        step={0.01}
        onValueChange={(v) => onSettingChange('pulseIntensity', v)}
      />
      <Field.Root>
        <HStack justify="space-between">
          <Field.Label fontSize="xs" color="gray.400">
            Show Number
          </Field.Label>
          <Switch.Root
            checked={settings.seele?.showNumber ?? true}
            onCheckedChange={(e) => onSettingChange('showNumber', e.checked)}
            size="sm"
            colorPalette="red"
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>
      </Field.Root>
      {settings.seele?.showNumber !== false && (
        <SliderField
          label="SEELE Number"
          display={String(settings.seele?.seeleNumber ?? 1).padStart(2, '0')}
          value={settings.seele?.seeleNumber ?? 1}
          min={1}
          max={12}
          step={1}
          rangeBg="rgba(255, 0, 0, 0.5)"
          onValueChange={(v) => onSettingChange('seeleNumber', v)}
          numberValue={String(settings.seele?.seeleNumber ?? 1)}
          onNumberValueChange={(s) =>
            onSettingChange('seeleNumber', parseInt(s) || 1)
          }
        />
      )}
    </>
  );
}
import type { JSX } from 'react';
