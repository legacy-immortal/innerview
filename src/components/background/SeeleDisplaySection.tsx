/**
 * SEELE display controls (number/label size and scanline speed).
 *
 * @module background/SeeleDisplaySection.tsx
 */
// SEELE size/scanline fields (extracted from SeeleControls.tsx).
import type { BackgroundSettings } from '@/lib/settings-types';
import { Field, HStack, Input } from '@chakra-ui/react';
import { SliderField, SliderOnlyField } from './controlFields';

type SeeleSlice = NonNullable<BackgroundSettings['seele']>;

export interface SeeleDisplaySectionProps {
  readonly settings: BackgroundSettings;
  readonly onSettingChange: <K extends keyof SeeleSlice>(
    key: K,
    value: SeeleSlice[K]
  ) => void;
}

export function SeeleDisplaySection({
  settings,
  onSettingChange,
}: SeeleDisplaySectionProps): JSX.Element {
  return (
    <>
      <SliderField
        label="Number Size"
        display={`${settings.seele?.numberSize ?? 120}px`}
        value={settings.seele?.numberSize ?? 120}
        min={60}
        max={200}
        step={1}
        rangeBg="rgba(255, 0, 0, 0.5)"
        onValueChange={(v) => onSettingChange('numberSize', v)}
        numberValue={String(settings.seele?.numberSize ?? 120)}
        onNumberValueChange={(s) =>
          onSettingChange('numberSize', parseInt(s) || 120)
        }
      />
      <SliderField
        label="Label Size"
        display={`${settings.seele?.labelSize ?? 32}px`}
        value={settings.seele?.labelSize ?? 32}
        min={16}
        max={64}
        step={1}
        rangeBg="rgba(255, 0, 0, 0.5)"
        onValueChange={(v) => onSettingChange('labelSize', v)}
        numberValue={String(settings.seele?.labelSize ?? 32)}
        onNumberValueChange={(s) =>
          onSettingChange('labelSize', parseInt(s) || 32)
        }
      />
      <SliderField
        label="Scanline Speed"
        display={`${(settings.seele?.scanlineSpeed ?? 3).toFixed(1)}s`}
        value={settings.seele?.scanlineSpeed ?? 3}
        min={1.0}
        max={10.0}
        step={0.1}
        rangeBg="rgba(255, 0, 0, 0.5)"
        onValueChange={(v) => onSettingChange('scanlineSpeed', v)}
        numberValue={(settings.seele?.scanlineSpeed ?? 3).toFixed(1)}
        onNumberValueChange={(s) =>
          onSettingChange('scanlineSpeed', parseFloat(s) || 3)
        }
      />
      <SliderOnlyField
        label="Scanline Opacity"
        display={`${((settings.seele?.scanlineOpacity ?? 0.3) * 100).toFixed(0)}%`}
        value={settings.seele?.scanlineOpacity ?? 0.3}
        min={0.0}
        max={1.0}
        step={0.01}
        onValueChange={(v) => onSettingChange('scanlineOpacity', v)}
      />
      <Field.Root>
        <Field.Label fontSize="xs" color="gray.400" mb={2}>
          Scanline Color
        </Field.Label>
        <HStack
          gap={2}
          w="full"
          minW={0}
          maxW="100%"
          flexWrap={{ base: 'wrap', sm: 'nowrap' }}
        >
          <Input
            type="color"
            value={
              settings.seele?.scanlineColor ??
              settings.seele?.textColor ??
              '#ff0000'
            }
            onChange={(e) => onSettingChange('scanlineColor', e.target.value)}
            w={{ base: '100%', sm: '50px' }}
            minW={0}
            h="24px"
            p={0}
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            borderRadius="sm"
            cursor="pointer"
          />
          <Input
            type="text"
            value={
              settings.seele?.scanlineColor ??
              settings.seele?.textColor ??
              '#ff0000'
            }
            onChange={(e) => onSettingChange('scanlineColor', e.target.value)}
            size="xs"
            bg="rgba(0, 0, 0, 0.3)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="gray.400"
            flex={1}
          />
        </HStack>
      </Field.Root>
    </>
  );
}
import type { JSX } from 'react';
