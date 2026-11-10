/**
 * @file Color background controls (solid color and gradient). Receives settings and a typed updater from the panel.
 * @module background/ColorControls
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
  NativeSelect,
  NumberInput,
  Slider,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FONT_FAMILY } from './controlFields';

type ColorSlice = NonNullable<BackgroundSettings['color']>;

export interface ColorControlsProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly settings: BackgroundSettings;
  readonly onSettingChange: <K extends keyof ColorSlice>(
    key: K,
    value: ColorSlice[K]
  ) => void;
}

function ColorControlsComponent({
  open,
  onOpenChange,
  settings,
  onSettingChange,
}: ColorControlsProps): JSX.Element {
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
          <Text fontSize="xs">Color Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2} maxW="100%" overflowX="hidden" boxSizing="border-box">
          <VStack gap={3} align="stretch">
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
                  value={settings.color?.color ?? '#000000'}
                  onChange={(e) => onSettingChange('color', e.target.value)}
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
                  value={settings.color?.color ?? '#000000'}
                  onChange={(e) => onSettingChange('color', e.target.value)}
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
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Enable Gradient
                </Field.Label>
                <Switch.Root
                  checked={settings.color?.gradientEnabled ?? false}
                  onCheckedChange={(e) =>
                    onSettingChange('gradientEnabled', e.checked)
                  }
                  size="sm"
                  colorPalette="purple"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </HStack>
            </Field.Root>
            {settings.color?.gradientEnabled && (
              <>
                <Field.Root>
                  <Field.Label fontSize="xs" color="gray.400" mb={2}>
                    Gradient Color
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
                      value={settings.color?.gradientColor ?? '#ffffff'}
                      onChange={(e) =>
                        onSettingChange('gradientColor', e.target.value)
                      }
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
                      value={settings.color?.gradientColor ?? '#ffffff'}
                      onChange={(e) =>
                        onSettingChange('gradientColor', e.target.value)
                      }
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
                    Gradient Direction
                  </Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={settings.color?.gradientDirection ?? 'vertical'}
                      onChange={(e) =>
                        onSettingChange(
                          'gradientDirection',
                          e.currentTarget.value as
                            'horizontal' | 'vertical' | 'diagonal' | 'radial'
                        )
                      }
                      bg="rgba(255, 255, 255, 0.05)"
                      borderColor="rgba(255, 255, 255, 0.1)"
                      color="white"
                      fontSize="xs"
                      _focus={{
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                      <option value="diagonal">Diagonal</option>
                      <option value="radial">Radial</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
              </>
            )}
            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Enable Scanlines
                </Field.Label>
                <Switch.Root
                  checked={settings.color?.scanlineEnabled ?? false}
                  onCheckedChange={(e) =>
                    onSettingChange('scanlineEnabled', e.checked)
                  }
                  size="sm"
                  colorPalette="purple"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </HStack>
            </Field.Root>
            {settings.color?.scanlineEnabled && (
              <>
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
                      value={settings.color?.scanlineColor ?? '#ffffff'}
                      onChange={(e) =>
                        onSettingChange('scanlineColor', e.target.value)
                      }
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
                      value={settings.color?.scanlineColor ?? '#ffffff'}
                      onChange={(e) =>
                        onSettingChange('scanlineColor', e.target.value)
                      }
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
                  <HStack justify="space-between" mb={2}>
                    <Field.Label fontSize="xs" color="gray.400">
                      Scanline Opacity
                    </Field.Label>
                    <Text fontSize="xs" color="gray.400">
                      {((settings.color?.scanlineOpacity ?? 0.1) * 100).toFixed(
                        0
                      )}
                      %
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
                        value={[settings.color?.scanlineOpacity ?? 0.1]}
                        onValueChange={(e) =>
                          onSettingChange('scanlineOpacity', e.value[0])
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
                      value={(
                        (settings.color?.scanlineOpacity ?? 0.1) * 100
                      ).toFixed(0)}
                      onValueChange={(e) =>
                        onSettingChange(
                          'scanlineOpacity',
                          (parseFloat(e.value) || 0) / 100
                        )
                      }
                      min={0}
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
                  <HStack justify="space-between" mb={2}>
                    <Field.Label fontSize="xs" color="gray.400">
                      Scanline Speed
                    </Field.Label>
                    <Text fontSize="xs" color="gray.400">
                      {(settings.color?.scanlineSpeed ?? 1).toFixed(1)}
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
                        value={[settings.color?.scanlineSpeed ?? 1]}
                        onValueChange={(e) =>
                          onSettingChange('scanlineSpeed', e.value[0])
                        }
                        min={0}
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
                      value={(settings.color?.scanlineSpeed ?? 1).toFixed(1)}
                      onValueChange={(e) =>
                        onSettingChange(
                          'scanlineSpeed',
                          parseFloat(e.value) || 0
                        )
                      }
                      min={0}
                      max={5}
                      step={0.1}
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
              </>
            )}
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/** Color background controls (solid/gradient color and scanlines). */
export const ColorControls = memo(ColorControlsComponent);
