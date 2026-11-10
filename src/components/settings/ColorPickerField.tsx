/**
 * @file Reusable color-picker with hex input, swatch, and reset affordance.
 * @module components/settings/ColorPickerField.tsx
 */
import type { JSX } from 'react';
import { HStack, Field, Input, Button } from '@chakra-ui/react';

/**
 * Props for {@link ColorPickerField}.
 */
interface ColorPickerFieldProps {
  /** Accessible label for the field. */
  readonly label: string;
  /** Helper text shown below the label. */
  readonly helperText: string;
  /** Current color value, or undefined to fall back to defaultValue. */
  readonly value: string | undefined;
  /** Fallback color used when value is undefined. */
  readonly defaultValue: string;
  /** Fired when the user edits the hex input or color swatch. */
  readonly onChange: (value: string) => void;
  /** Fired when the user clicks "Reset". */
  readonly onReset: () => void;
}

/**
 * Reusable color-picker with hex input, swatch, and reset affordance.
 *
 * Accepts any CSS color string. Non-hex values (e.g. 'transparent') render a
 * black swatch since `<input type="color">` cannot represent them.
 *
 * @example
 *   <ColorPickerField
 *     label="Sidebar Background Color"
 *     value={settings.sidebarBackgroundColor}
 *     defaultValue="transparent"
 *     onChange={(value) => setSettings((prev) => ({ ...prev, sidebarBackgroundColor: value }))}
 *     onReset={() => setSettings((prev) => ({ ...prev, sidebarBackgroundColor: 'transparent' }))}
 *   />
 * @see {@link ColorPickerFieldProps}
 */
export function ColorPickerField({
  label,
  helperText,
  value,
  defaultValue,
  onChange,
  onReset,
}: ColorPickerFieldProps): JSX.Element {
  const currentValue = value || defaultValue;
  const isHexColor = currentValue.startsWith('#');
  const colorValue =
    currentValue === 'transparent' || !isHexColor ? '#000000' : currentValue;

  return (
    <Field.Root>
      <Field.Label color="gray.300">{label}</Field.Label>
      <Field.HelperText color="gray.500" fontSize="xs">
        {helperText}
      </Field.HelperText>
      <HStack gap={2} flexWrap="wrap">
        <Input
          type="text"
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultValue}
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          flex={1}
        />
        <Input
          type="color"
          value={colorValue}
          onChange={(e) => onChange(e.target.value)}
          w="60px"
          h="32px"
          p={0}
          border="none"
          cursor="pointer"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
        >
          Reset
        </Button>
      </HStack>
    </Field.Root>
  );
}
