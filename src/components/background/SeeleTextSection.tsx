/**
 * SEELE text controls (top/bottom text, font, and colors).
 *
 * @module background/SeeleTextSection.tsx
 */
// SEELE text/font/color fields (extracted from SeeleControls.tsx).
import {
  SEELE_DEFAULT_BOTTOM_TEXT,
  SEELE_DEFAULT_TOP_TEXT,
  SEELE_FONT_OPTIONS,
} from '@/components/animations/Seele';
import type { BackgroundSettings } from '@/lib/settings-types';
import { Button, Field, HStack, Input, NativeSelect } from '@chakra-ui/react';
import { FONT_FAMILY } from './controlFields';

type SeeleSlice = NonNullable<BackgroundSettings['seele']>;

export interface SeeleTextSectionProps {
  readonly settings: BackgroundSettings;
  readonly onSettingChange: <K extends keyof SeeleSlice>(
    key: K,
    value: SeeleSlice[K]
  ) => void;
  readonly onSettingsChange: (settings: BackgroundSettings) => void;
}

export function SeeleTextSection({
  settings,
  onSettingChange,
  onSettingsChange,
}: SeeleTextSectionProps): JSX.Element {
  return (
    <>
      <Field.Root>
        <Field.Label fontSize="xs" color="gray.400" mb={2}>
          Top Text
        </Field.Label>
        <Input
          value={settings.seele?.topText ?? SEELE_DEFAULT_TOP_TEXT}
          onChange={(e) => onSettingChange('topText', e.target.value)}
          size="xs"
          fontFamily={FONT_FAMILY}
          bg="rgba(0, 0, 0, 0.3)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="gray.400"
          w="full"
          placeholder={SEELE_DEFAULT_TOP_TEXT}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label fontSize="xs" color="gray.400" mb={2}>
          Bottom Text
        </Field.Label>
        <Input
          value={settings.seele?.bottomText ?? SEELE_DEFAULT_BOTTOM_TEXT}
          onChange={(e) => onSettingChange('bottomText', e.target.value)}
          size="xs"
          fontFamily={FONT_FAMILY}
          bg="rgba(0, 0, 0, 0.3)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="gray.400"
          w="full"
          placeholder={SEELE_DEFAULT_BOTTOM_TEXT}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label fontSize="xs" color="gray.400" mb={2}>
          Font
        </Field.Label>
        <NativeSelect.Root size="xs">
          <NativeSelect.Field
            value={settings.seele?.fontFamily ?? SEELE_FONT_OPTIONS[0].value}
            onChange={(e) =>
              onSettingChange('fontFamily', e.currentTarget.value)
            }
            fontFamily={FONT_FAMILY}
            bg="rgba(0, 0, 0, 0.3)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="gray.400"
            w="full"
          >
            {SEELE_FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Field.Root>
      <Button
        size="xs"
        variant="outline"
        color="gray.400"
        borderColor="rgba(255, 255, 255, 0.1)"
        _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
        fontFamily={FONT_FAMILY}
        onClick={() => {
          onSettingsChange({
            ...settings,
            seele: {
              ...settings.seele,
              topText: SEELE_DEFAULT_TOP_TEXT,
              bottomText: SEELE_DEFAULT_BOTTOM_TEXT,
            },
          });
        }}
      >
        Restore default text
      </Button>
      <Field.Root>
        <Field.Label fontSize="xs" color="gray.400" mb={2}>
          Text Color
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
            value={settings.seele?.textColor ?? '#ff0000'}
            onChange={(e) => onSettingChange('textColor', e.target.value)}
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
            value={settings.seele?.textColor ?? '#ff0000'}
            onChange={(e) => onSettingChange('textColor', e.target.value)}
            size="xs"
            fontFamily={FONT_FAMILY}
            bg="rgba(0, 0, 0, 0.3)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="gray.400"
            flex={1}
          />
        </HStack>
      </Field.Root>
      <Field.Root>
        <Field.Label fontSize="xs" color="gray.400" mb={2}>
          Background Color
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
            value={settings.seele?.bgColor ?? '#000000'}
            onChange={(e) => onSettingChange('bgColor', e.target.value)}
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
            value={settings.seele?.bgColor ?? '#000000'}
            onChange={(e) => onSettingChange('bgColor', e.target.value)}
            size="xs"
            fontFamily={FONT_FAMILY}
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
