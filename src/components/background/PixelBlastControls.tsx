import type { BackgroundSettings } from '@/lib/settings-types';
import {
  Box,
  Button,
  Collapsible,
  Field,
  HStack,
  Input,
  NativeSelect,
  NumberInput,
  Slider,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';

type PixelBlastSettings = NonNullable<BackgroundSettings['pixelblast']>;
type Variant = NonNullable<PixelBlastSettings['variant']>;

interface PixelBlastControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BackgroundSettings;
  onSettingChange: <K extends keyof PixelBlastSettings>(
    key: K,
    value: PixelBlastSettings[K]
  ) => void;
}

export function PixelBlastControls({
  open,
  onOpenChange,
  settings,
  onSettingChange,
}: PixelBlastControlsProps) {
  const pb = settings.pixelblast;

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
          <Text fontSize="xs">Pixel Blast Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2}>
          <VStack gap={3} align="stretch">
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Variant
              </Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={pb?.variant ?? 'square'}
                  onChange={(e) => {
                    onSettingChange(
                      'variant',
                      e.currentTarget.value as Variant
                    );
                  }}
                  bg="rgba(255, 255, 255, 0.05)"
                  borderColor="rgba(255, 255, 255, 0.1)"
                  color="white"
                  fontSize="xs"
                  _focus={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <option value="square">Square</option>
                  <option value="circle">Circle</option>
                  <option value="triangle">Triangle</option>
                  <option value="diamond">Diamond</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Pixel Size
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {pb?.pixelSize ?? 3}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[pb?.pixelSize ?? 3]}
                    onValueChange={(e) =>
                      onSettingChange('pixelSize', Math.round(e.value[0]))
                    }
                    min={1}
                    max={20}
                    step={1}
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
                  value={(pb?.pixelSize ?? 3).toString()}
                  onValueChange={(e) =>
                    onSettingChange(
                      'pixelSize',
                      Math.round(parseFloat(e.value) || 1)
                    )
                  }
                  min={1}
                  max={20}
                  step={1}
                  size="xs"
                  w="70px"
                >
                  <NumberInput.Control />
                  <NumberInput.Input
                    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                    fontSize="2xs"
                    bg="rgba(0, 0, 0, 0.3)"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    color="gray.300"
                  />
                </NumberInput.Root>
              </HStack>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Color
              </Field.Label>
              <HStack gap={2}>
                <Input
                  type="color"
                  value={pb?.color ?? '#B19EEF'}
                  onChange={(e) => {
                    onSettingChange('color', e.target.value);
                  }}
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
                  value={(pb?.color ?? '#B19EEF').toUpperCase()}
                  onChange={(e) => {
                    const hex = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                      onSettingChange('color', hex);
                    }
                  }}
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
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Pattern Scale
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {pb?.patternScale ?? 2}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[pb?.patternScale ?? 2]}
                    onValueChange={(e) =>
                      onSettingChange('patternScale', e.value[0])
                    }
                    min={0.5}
                    max={10}
                    step={0.1}
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
                  value={(pb?.patternScale ?? 2).toFixed(1)}
                  onValueChange={(e) =>
                    onSettingChange('patternScale', parseFloat(e.value) || 0.5)
                  }
                  min={0.5}
                  max={10}
                  step={0.1}
                  size="xs"
                  w="70px"
                >
                  <NumberInput.Control />
                  <NumberInput.Input
                    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                    fontSize="2xs"
                    bg="rgba(0, 0, 0, 0.3)"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    color="gray.300"
                  />
                </NumberInput.Root>
              </HStack>
            </Field.Root>

            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Pattern Density
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(pb?.patternDensity ?? 1).toFixed(2)}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[pb?.patternDensity ?? 1]}
                    onValueChange={(e) =>
                      onSettingChange('patternDensity', e.value[0])
                    }
                    min={0}
                    max={2}
                    step={0.01}
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
                  value={(pb?.patternDensity ?? 1).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('patternDensity', parseFloat(e.value) || 0)
                  }
                  min={0}
                  max={2}
                  step={0.01}
                  size="xs"
                  w="70px"
                >
                  <NumberInput.Control />
                  <NumberInput.Input
                    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                    fontSize="2xs"
                    bg="rgba(0, 0, 0, 0.3)"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    color="gray.300"
                  />
                </NumberInput.Root>
              </HStack>
            </Field.Root>

            <Switch.Root
              checked={pb?.liquid ?? false}
              onCheckedChange={(e) =>
                onSettingChange('liquid', e.checked === true)
              }
              size="sm"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label fontSize="xs" color="gray.400">
                Liquid Effect
              </Switch.Label>
            </Switch.Root>

            {pb?.liquid && (
              <Field.Root>
                <HStack justify="space-between" mb={2}>
                  <Field.Label fontSize="xs" color="gray.400">
                    Liquid Strength
                  </Field.Label>
                  <Text fontSize="xs" color="gray.400">
                    {(pb?.liquidStrength ?? 0.1).toFixed(2)}
                  </Text>
                </HStack>
                <HStack gap={2} align="center" w="full">
                  <Box flex={1} w="full" minW={0}>
                    <Slider.Root
                      value={[pb?.liquidStrength ?? 0.1]}
                      onValueChange={(e) =>
                        onSettingChange('liquidStrength', e.value[0])
                      }
                      min={0}
                      max={1}
                      step={0.01}
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
                    value={(pb?.liquidStrength ?? 0.1).toFixed(2)}
                    onValueChange={(e) =>
                      onSettingChange(
                        'liquidStrength',
                        parseFloat(e.value) || 0
                      )
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    size="xs"
                    w="70px"
                  >
                    <NumberInput.Control />
                    <NumberInput.Input
                      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                      fontSize="2xs"
                      bg="rgba(0, 0, 0, 0.3)"
                      borderColor="rgba(255, 255, 255, 0.1)"
                      color="gray.300"
                    />
                  </NumberInput.Root>
                </HStack>
              </Field.Root>
            )}

            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Speed
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(pb?.speed ?? 0.5).toFixed(2)}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[pb?.speed ?? 0.5]}
                    onValueChange={(e) => onSettingChange('speed', e.value[0])}
                    min={0}
                    max={2}
                    step={0.01}
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
                  value={(pb?.speed ?? 0.5).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('speed', parseFloat(e.value) || 0)
                  }
                  min={0}
                  max={2}
                  step={0.01}
                  size="xs"
                  w="70px"
                >
                  <NumberInput.Control />
                  <NumberInput.Input
                    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                    fontSize="2xs"
                    bg="rgba(0, 0, 0, 0.3)"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    color="gray.300"
                  />
                </NumberInput.Root>
              </HStack>
            </Field.Root>
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
