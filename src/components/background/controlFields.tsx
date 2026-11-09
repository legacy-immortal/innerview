/**
 * Shared form fields for background panels: collapsible sections, sliders, and color inputs.
 *
 * @module background/controlFields.tsx
 */
// Shared collapsible/slider/color controls for background panels
// (extracted from HypnoticControls.tsx and SeeleControls.tsx).
import {
  Box,
  Button,
  Collapsible,
  Field,
  HStack,
  Input,
  NumberInput,
  Slider,
  Text,
} from '@chakra-ui/react';
import type { JSX, ReactNode } from 'react';

export const FONT_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace";

export function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
}: {
  readonly title: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <Collapsible.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Collapsible.Trigger asChild>
        <Button
          variant="ghost"
          size="xs"
          w="100%"
          maxW="100%"
          justifyContent="space-between"
          color="gray.300"
          _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
          fontFamily={FONT_FAMILY}
        >
          <Text fontSize="xs">{title}</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2} maxW="100%" overflowX="hidden" boxSizing="border-box">
          {children}
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export interface SliderFieldProps {
  readonly label: string;
  readonly display: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly rangeBg?: string;
  readonly onValueChange: (value: number) => void;
  readonly numberValue?: string;
  readonly onNumberValueChange?: (value: string) => void;
  readonly numberStep?: number;
}

export function SliderField({
  label,
  display,
  value,
  min,
  max,
  step,
  rangeBg = 'rgba(139, 92, 246, 0.5)',
  onValueChange,
  numberValue,
  onNumberValueChange,
  numberStep,
}: SliderFieldProps): JSX.Element {
  return (
    <Field.Root>
      <HStack justify="space-between" mb={2}>
        <Field.Label fontSize="xs" color="gray.400">
          {label}
        </Field.Label>
        <Text fontSize="xs" color="gray.400">
          {display}
        </Text>
      </HStack>
      <HStack
        gap={2}
        align="center"
        w="full"
        maxW="100%"
        flexWrap={{ base: 'wrap', sm: 'nowrap' }}
        touchAction="none"
      >
        <Box
          flex={1}
          w="full"
          minW={0}
          maxW="100%"
          flexBasis={{ base: '100%', sm: 'auto' }}
        >
          <Slider.Root
            touchAction="none"
            value={[value]}
            onValueChange={(e) => onValueChange(e.value[0])}
            min={min}
            max={max}
            step={step}
            size="sm"
            w="full"
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range bg={rangeBg} />
              </Slider.Track>
              <Slider.Thumbs />
            </Slider.Control>
          </Slider.Root>
        </Box>
        {onNumberValueChange && (
          <NumberInput.Root
            value={numberValue ?? String(value)}
            onValueChange={(e) => onNumberValueChange(e.value)}
            min={min}
            max={max}
            step={numberStep ?? step}
            size="xs"
            w={{ base: '100%', sm: '70px' }}
            minW={0}
          >
            <NumberInput.Control />
            <NumberInput.Input
              fontFamily={FONT_FAMILY}
              fontSize="2xs"
              bg="rgba(0, 0, 0, 0.3)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="gray.300"
            />
          </NumberInput.Root>
        )}
      </HStack>
    </Field.Root>
  );
}

export function SliderOnlyField({
  label,
  display,
  value,
  min,
  max,
  step,
  rangeBg = 'rgba(255, 0, 0, 0.5)',
  onValueChange,
}: Omit<
  SliderFieldProps,
  'numberValue' | 'onNumberValueChange' | 'numberStep'
>): JSX.Element {
  return (
    <Field.Root>
      <HStack justify="space-between" mb={2}>
        <Field.Label fontSize="xs" color="gray.400">
          {label}
        </Field.Label>
        <Text fontSize="xs" color="gray.400">
          {display}
        </Text>
      </HStack>
      <Box w="full" minW={0} maxW="100%" boxSizing="border-box">
        <Slider.Root
          touchAction="none"
          value={[value]}
          onValueChange={(e) => onValueChange(e.value[0])}
          min={min}
          max={max}
          step={step}
          size="sm"
          w="full"
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Range bg={rangeBg} />
            </Slider.Track>
            <Slider.Thumbs />
          </Slider.Control>
        </Slider.Root>
      </Box>
    </Field.Root>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}): JSX.Element {
  return (
    <Field.Root>
      <Field.Label fontSize="xs" color="gray.400" mb={1}>
        {label}
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          w={{ base: '100%', sm: '60px' }}
          minW={0}
          h="32px"
          p={0}
          border="1px solid"
          borderColor="rgba(255, 255, 255, 0.1)"
          borderRadius="sm"
          cursor="pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          size="xs"
          fontFamily={FONT_FAMILY}
          bg="rgba(0, 0, 0, 0.3)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="gray.300"
          flex={1}
        />
      </HStack>
    </Field.Root>
  );
}
