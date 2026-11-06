import type { BackgroundSettings } from '@/lib/settings-types';
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
  VStack,
} from '@chakra-ui/react';

type PulsarSettings = NonNullable<BackgroundSettings['pulsar']>;

interface PulsarControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BackgroundSettings;
  onSettingChange: <K extends keyof PulsarSettings>(
    key: K,
    value: PulsarSettings[K]
  ) => void;
}

const inputStyles = {
  fontFamily:
    "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
  fontSize: '2xs',
  bg: 'rgba(0, 0, 0, 0.3)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  color: 'gray.300',
} as const;

export function PulsarControls({
  open,
  onOpenChange,
  settings,
  onSettingChange,
}: PulsarControlsProps) {
  const pulsar = settings.pulsar;

  return (
    <Collapsible.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Collapsible.Trigger asChild>
        <Button
          variant="ghost"
          size="xs"
          w="100%"
          justifyContent="space-between"
          color="gray.300"
          _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
        >
          <Text fontSize="xs">Pulsar Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2}>
          <VStack gap={3} align="stretch">
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Line Color
              </Field.Label>
              <HStack gap={2}>
                <Input
                  type="color"
                  value={pulsar?.lineColor ?? '#ffffff'}
                  onChange={(e) => onSettingChange('lineColor', e.target.value)}
                  w="50px"
                  h="24px"
                  p={0}
                  border="1px solid"
                  borderColor="rgba(255, 255, 255, 0.1)"
                  borderRadius="sm"
                  cursor="pointer"
                />
                <Input
                  type="text"
                  value={pulsar?.lineColor ?? '#ffffff'}
                  onChange={(e) => onSettingChange('lineColor', e.target.value)}
                  size="xs"
                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
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
              <HStack gap={2}>
                <Input
                  type="color"
                  value={pulsar?.bgColor ?? '#000000'}
                  onChange={(e) => onSettingChange('bgColor', e.target.value)}
                  w="50px"
                  h="24px"
                  p={0}
                  border="1px solid"
                  borderColor="rgba(255, 255, 255, 0.1)"
                  borderRadius="sm"
                  cursor="pointer"
                />
                <Input
                  type="text"
                  value={pulsar?.bgColor ?? '#000000'}
                  onChange={(e) => onSettingChange('bgColor', e.target.value)}
                  size="xs"
                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                  bg="rgba(0, 0, 0, 0.3)"
                  borderColor="rgba(255, 255, 255, 0.1)"
                  color="gray.400"
                  flex={1}
                />
              </HStack>
            </Field.Root>

            {[
              {
                key: 'lineSpacing' as const,
                label: 'Line Spacing',
                value: pulsar?.lineSpacing ?? 0.13,
                min: 0.05,
                max: 0.5,
                step: 0.01,
              },
              {
                key: 'scale' as const,
                label: 'Horizontal Scale',
                value: pulsar?.scale ?? 0.78,
                min: 0.01,
                max: 1.0,
                step: 0.01,
              },
              {
                key: 'verticalScale' as const,
                label: 'Amplitude Scale',
                value: pulsar?.verticalScale ?? 0.03,
                min: 0.0,
                max: 1.0,
                step: 0.01,
              },
              {
                key: 'rotationX' as const,
                label: 'Rotation X',
                value: pulsar?.rotationX ?? 0.49,
                min: -Math.PI,
                max: Math.PI,
                step: 0.01,
              },
              {
                key: 'rotationY' as const,
                label: 'Rotation Y',
                value: pulsar?.rotationY ?? 0,
                min: -Math.PI,
                max: Math.PI,
                step: 0.01,
              },
              {
                key: 'animationSpeed' as const,
                label: 'Animation Speed',
                value: pulsar?.animationSpeed ?? 0.2,
                min: 0.0,
                max: 1.0,
                step: 0.01,
              },
            ].map(({ key, label, value, min, max, step }) => (
              <Field.Root key={key}>
                <HStack justify="space-between" mb={2}>
                  <Field.Label fontSize="xs" color="gray.400">
                    {label}
                  </Field.Label>
                  <Text fontSize="xs" color="gray.400">
                    {value.toFixed(2)}
                  </Text>
                </HStack>
                <HStack gap={2} align="center" w="full">
                  <Box flex={1} w="full" minW={0}>
                    <Slider.Root
                      value={[value]}
                      onValueChange={(e) => onSettingChange(key, e.value[0])}
                      min={min}
                      max={max}
                      step={step}
                      size="sm"
                      w="full"
                    >
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Range bg="rgba(139, 92, 246, 0.5)" />
                        </Slider.Track>
                        <Slider.Thumbs />
                      </Slider.Control>
                    </Slider.Root>
                  </Box>
                  <NumberInput.Root
                    value={value.toFixed(2)}
                    onValueChange={(e) =>
                      onSettingChange(key, parseFloat(e.value) ?? min)
                    }
                    min={min}
                    max={max}
                    step={step}
                    size="xs"
                    w="70px"
                  >
                    <NumberInput.Control />
                    <NumberInput.Input {...inputStyles} />
                  </NumberInput.Root>
                </HStack>
              </Field.Root>
            ))}
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
