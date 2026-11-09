/**
 * Dither background controls (retro pixel-dither effect).
 *
 * @module background/DitherControls.tsx
 */
import type { JSX } from 'react';
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
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';

type DitherSettings = NonNullable<BackgroundSettings['dither']>;

interface DitherControlsProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly settings: BackgroundSettings;
  readonly onSettingChange: <K extends keyof DitherSettings>(
    key: K,
    value: DitherSettings[K]
  ) => void;
}

export function DitherControls({
  open,
  onOpenChange,
  settings,
  onSettingChange,
}: DitherControlsProps): JSX.Element {
  const dither = settings.dither;

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
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
        >
          <Text fontSize="xs">Dither Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2} maxW="100%" overflowX="hidden" boxSizing="border-box">
          <VStack gap={3} align="stretch">
            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Wave Speed
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(dither?.waveSpeed ?? 0.05).toFixed(2)}
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
                    value={[dither?.waveSpeed ?? 0.05]}
                    onValueChange={(e) =>
                      onSettingChange('waveSpeed', e.value[0])
                    }
                    min={0}
                    max={0.5}
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
                  value={(dither?.waveSpeed ?? 0.05).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('waveSpeed', parseFloat(e.value) || 0)
                  }
                  min={0}
                  max={0.5}
                  step={0.01}
                  size="xs"
                  w={{ base: '100%', sm: '70px' }}
                  minW={0}
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
                  Wave Frequency
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {dither?.waveFrequency ?? 3}
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
                    value={[dither?.waveFrequency ?? 3]}
                    onValueChange={(e) =>
                      onSettingChange('waveFrequency', e.value[0])
                    }
                    min={1}
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
                  value={(dither?.waveFrequency ?? 3).toString()}
                  onValueChange={(e) =>
                    onSettingChange('waveFrequency', parseFloat(e.value) || 1)
                  }
                  min={1}
                  max={10}
                  step={0.1}
                  size="xs"
                  w={{ base: '100%', sm: '70px' }}
                  minW={0}
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
                  Wave Amplitude
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(dither?.waveAmplitude ?? 0.3).toFixed(2)}
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
                    value={[dither?.waveAmplitude ?? 0.3]}
                    onValueChange={(e) =>
                      onSettingChange('waveAmplitude', e.value[0])
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
                  value={(dither?.waveAmplitude ?? 0.3).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('waveAmplitude', parseFloat(e.value) || 0)
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  size="xs"
                  w={{ base: '100%', sm: '70px' }}
                  minW={0}
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
                Wave Color
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
                    dither?.waveColor
                      ? `#${dither.waveColor.replace('#', '').slice(0, 6)}`
                      : '#808080'
                  }
                  onChange={(e) => {
                    onSettingChange('waveColor', e.target.value);
                  }}
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
                    dither?.waveColor
                      ? dither.waveColor.toUpperCase()
                      : '#808080'
                  }
                  onChange={(e) => {
                    const hex = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                      onSettingChange('waveColor', hex);
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

            <Switch.Root
              checked={dither?.enableMouseInteraction ?? true}
              onCheckedChange={(e) =>
                onSettingChange('enableMouseInteraction', e.checked === true)
              }
              size="sm"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label fontSize="xs" color="gray.400">
                Mouse Interaction
              </Switch.Label>
            </Switch.Root>

            {dither?.enableMouseInteraction && (
              <Field.Root>
                <HStack justify="space-between" mb={2}>
                  <Field.Label fontSize="xs" color="gray.400">
                    Mouse Radius
                  </Field.Label>
                  <Text fontSize="xs" color="gray.400">
                    {dither?.mouseRadius ?? 1}
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
                      value={[dither?.mouseRadius ?? 1]}
                      onValueChange={(e) =>
                        onSettingChange('mouseRadius', e.value[0])
                      }
                      min={0.1}
                      max={5}
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
                    value={(dither?.mouseRadius ?? 1).toFixed(1)}
                    onValueChange={(e) =>
                      onSettingChange('mouseRadius', parseFloat(e.value) || 0.1)
                    }
                    min={0.1}
                    max={5}
                    step={0.1}
                    size="xs"
                    w={{ base: '100%', sm: '70px' }}
                    minW={0}
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
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
