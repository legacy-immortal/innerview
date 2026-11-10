/**
 * @file Orb background controls (hue and motion).
 * @module background/OrbControls
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
  NumberInput,
  Slider,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FONT_FAMILY } from './controlFields';

type OrbSettings = NonNullable<BackgroundSettings['orb']>;

interface OrbControlsProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly settings: BackgroundSettings;
  readonly onSettingChange: <K extends keyof OrbSettings>(
    key: K,
    value: OrbSettings[K]
  ) => void;
}

function OrbControlsComponent({
  open,
  onOpenChange,
  settings,
  onSettingChange,
}: OrbControlsProps): JSX.Element {
  const orb = settings.orb;

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
          <Text fontSize="xs">Orb Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2} maxW="100%" overflowX="hidden" boxSizing="border-box">
          <VStack gap={3} align="stretch">
            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Hue
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {orb?.hue ?? 0}°
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
                    value={[orb?.hue ?? 0]}
                    onValueChange={(e) =>
                      onSettingChange('hue', Math.round(e.value[0]))
                    }
                    min={0}
                    max={360}
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
                  value={(orb?.hue ?? 0).toString()}
                  onValueChange={(e) =>
                    onSettingChange('hue', Math.round(parseFloat(e.value) || 0))
                  }
                  min={0}
                  max={360}
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
                  Hover Intensity
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(orb?.hoverIntensity ?? 0.2).toFixed(2)}
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
                    value={[orb?.hoverIntensity ?? 0.2]}
                    onValueChange={(e) =>
                      onSettingChange('hoverIntensity', e.value[0])
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
                  value={(orb?.hoverIntensity ?? 0.2).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('hoverIntensity', parseFloat(e.value) || 0)
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
                    fontFamily={FONT_FAMILY}
                    fontSize="2xs"
                    bg="rgba(0, 0, 0, 0.3)"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    color="gray.300"
                  />
                </NumberInput.Root>
              </HStack>
            </Field.Root>

            <Switch.Root
              checked={orb?.rotateOnHover ?? true}
              onCheckedChange={(e) =>
                onSettingChange('rotateOnHover', e.checked === true)
              }
              size="sm"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label fontSize="xs" color="gray.400">
                Rotate on Hover
              </Switch.Label>
            </Switch.Root>
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/** Orb background controls (hue, hover intensity, and rotation). */
export const OrbControls = memo(OrbControlsComponent);
