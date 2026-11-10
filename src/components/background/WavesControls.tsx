/**
 * @file Waves background controls.
 * @module background/WavesControls
 */
import type { JSX } from 'react';
import { memo } from 'react';
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
import { FONT_FAMILY } from './controlFields';

type WavesSettings = NonNullable<BackgroundSettings['waves']>;

interface WavesControlsProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly settings: BackgroundSettings;
  readonly onSettingChange: <K extends keyof WavesSettings>(
    key: K,
    value: WavesSettings[K]
  ) => void;
}

function WavesControlsComponent({
  open,
  onOpenChange,
  settings,
  onSettingChange,
}: WavesControlsProps): JSX.Element {
  const waves = settings.waves;

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
          <Text fontSize="xs">Waves Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2} maxW="100%" overflowX="hidden" boxSizing="border-box">
          <VStack gap={3} align="stretch">
            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Point Count
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {waves?.pointCount ?? 50}
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
                    value={[waves?.pointCount ?? 50]}
                    onValueChange={(e) =>
                      onSettingChange('pointCount', Math.round(e.value[0]))
                    }
                    min={10}
                    max={200}
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
                  value={(waves?.pointCount ?? 50).toString()}
                  onValueChange={(e) =>
                    onSettingChange(
                      'pointCount',
                      Math.round(parseFloat(e.value) || 10)
                    )
                  }
                  min={10}
                  max={200}
                  step={1}
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
              </HStack>
            </Field.Root>

            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Speed
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(waves?.speed ?? 0.5).toFixed(2)}
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
                    value={[waves?.speed ?? 0.5]}
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
                  value={(waves?.speed ?? 0.5).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('speed', parseFloat(e.value) || 0)
                  }
                  min={0}
                  max={2}
                  step={0.01}
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
              </HStack>
            </Field.Root>

            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Amplitude
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(waves?.amplitude ?? 0.5).toFixed(2)}
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
                    value={[waves?.amplitude ?? 0.5]}
                    onValueChange={(e) =>
                      onSettingChange('amplitude', e.value[0])
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
                  value={(waves?.amplitude ?? 0.5).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('amplitude', parseFloat(e.value) || 0)
                  }
                  min={0}
                  max={2}
                  step={0.01}
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
              </HStack>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Color
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
                  value={waves?.color ?? '#000000'}
                  onChange={(e) => {
                    onSettingChange('color', e.target.value);
                  }}
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
                  value={(waves?.color ?? '#000000').toUpperCase()}
                  onChange={(e) => {
                    const hex = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                      onSettingChange('color', hex);
                    }
                  }}
                  size="xs"
                  fontFamily={FONT_FAMILY}
                  bg="rgba(0, 0, 0, 0.3)"
                  borderColor="rgba(255, 255, 255, 0.1)"
                  color="gray.300"
                  flex={1}
                />
              </HStack>
            </Field.Root>

            <Switch.Root
              checked={waves?.enableMouseInteraction ?? false}
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

            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Horizontal Spacing (xGap)
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {waves?.xGap ?? 10}
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
                    value={[waves?.xGap ?? 10]}
                    onValueChange={(e) =>
                      onSettingChange('xGap', Math.round(e.value[0]))
                    }
                    min={5}
                    max={50}
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
                  value={(waves?.xGap ?? 10).toString()}
                  onValueChange={(e) =>
                    onSettingChange(
                      'xGap',
                      Math.round(parseFloat(e.value) || 5)
                    )
                  }
                  min={5}
                  max={50}
                  step={1}
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
              </HStack>
            </Field.Root>

            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Vertical Spacing (yGap)
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {waves?.yGap ?? 32}
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
                    value={[waves?.yGap ?? 32]}
                    onValueChange={(e) =>
                      onSettingChange('yGap', Math.round(e.value[0]))
                    }
                    min={10}
                    max={100}
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
                  value={(waves?.yGap ?? 32).toString()}
                  onValueChange={(e) =>
                    onSettingChange(
                      'yGap',
                      Math.round(parseFloat(e.value) || 10)
                    )
                  }
                  min={10}
                  max={100}
                  step={1}
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
              </HStack>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Animation Direction
              </Field.Label>
              <VStack
                gap={2}
                align="stretch"
                maxW="100%"
                boxSizing="border-box"
              >
                <Switch.Root
                  checked={waves?.reverseX ?? false}
                  onCheckedChange={(e) =>
                    onSettingChange('reverseX', e.checked === true)
                  }
                  size="sm"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Label fontSize="xs" color="gray.400">
                    Reverse Horizontal Direction
                  </Switch.Label>
                </Switch.Root>

                <Switch.Root
                  checked={waves?.reverseY ?? false}
                  onCheckedChange={(e) =>
                    onSettingChange('reverseY', e.checked === true)
                  }
                  size="sm"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Label fontSize="xs" color="gray.400">
                    Reverse Vertical Direction
                  </Switch.Label>
                </Switch.Root>
              </VStack>
            </Field.Root>
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/** Waves background controls (geometry, color, spacing, direction, and interaction). */
export const WavesControls = memo(WavesControlsComponent);
