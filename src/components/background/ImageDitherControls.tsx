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

type ImageDitherSlice = NonNullable<BackgroundSettings['imagedither']>;

const FONT_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace";

export interface ImageDitherControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BackgroundSettings;
  onSettingChange: <K extends keyof ImageDitherSlice>(
    key: K,
    value: ImageDitherSlice[K]
  ) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageDitherControls({
  open,
  onOpenChange,
  settings,
  onSettingChange,
  fileInputRef,
  onFileChange,
}: ImageDitherControlsProps) {
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
          fontFamily={FONT_FAMILY}
        >
          <Text fontSize="xs">Image Dither Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2}>
          <VStack gap={3} align="stretch">
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Image URL
              </Field.Label>
              <Input
                type="text"
                value={settings.imagedither?.image ?? ''}
                onChange={(e) => onSettingChange('image', e.target.value)}
                placeholder="https://example.com/image.jpg"
                size="xs"
                fontFamily={FONT_FAMILY}
                bg="rgba(0, 0, 0, 0.3)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="gray.400"
              />
            </Field.Root>
            <HStack gap={2} flexWrap="wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onFileChange}
              />
              <Button
                size="xs"
                variant="outline"
                color="gray.400"
                borderColor="rgba(255, 255, 255, 0.1)"
                _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload image
              </Button>
              <Button
                size="xs"
                variant="outline"
                color="gray.400"
                borderColor="rgba(255, 255, 255, 0.1)"
                _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                onClick={() => onSettingChange('image', '')}
              >
                Clear image
              </Button>
            </HStack>
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Dithering Type
              </Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={settings.imagedither?.type ?? '8x8'}
                  onChange={(e) =>
                    onSettingChange(
                      'type',
                      e.currentTarget.value as 'random' | '2x2' | '4x4' | '8x8'
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
                  <option value="random">Random</option>
                  <option value="2x2">2x2 Bayer</option>
                  <option value="4x4">4x4 Bayer</option>
                  <option value="8x8">8x8 Bayer</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Pixel Size
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {settings.imagedither?.pxSize ?? 4}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[settings.imagedither?.pxSize ?? 4]}
                    onValueChange={(e) =>
                      onSettingChange('pxSize', Math.round(e.value[0]))
                    }
                    min={1}
                    max={32}
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
                  value={(settings.imagedither?.pxSize ?? 4).toString()}
                  onValueChange={(e) =>
                    onSettingChange('pxSize', parseInt(e.value) || 4)
                  }
                  min={1}
                  max={32}
                  step={1}
                  size="xs"
                  w="70px"
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
                  Color Steps
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {settings.imagedither?.colorSteps ?? 4}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[settings.imagedither?.colorSteps ?? 4]}
                    onValueChange={(e) =>
                      onSettingChange('colorSteps', Math.round(e.value[0]))
                    }
                    min={2}
                    max={16}
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
                  value={(settings.imagedither?.colorSteps ?? 4).toString()}
                  onValueChange={(e) =>
                    onSettingChange('colorSteps', parseInt(e.value) || 4)
                  }
                  min={2}
                  max={16}
                  step={1}
                  size="xs"
                  w="70px"
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
                  Use Original Colors
                </Field.Label>
                <Switch.Root
                  checked={settings.imagedither?.originalColors ?? false}
                  onCheckedChange={(e) =>
                    onSettingChange('originalColors', e.checked)
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
            {!settings.imagedither?.originalColors && (
              <>
                <Field.Root>
                  <Field.Label fontSize="xs" color="gray.400" mb={2}>
                    Front Color
                  </Field.Label>
                  <HStack gap={2}>
                    <Input
                      type="color"
                      value={settings.imagedither?.colorFront ?? '#ffffff'}
                      onChange={(e) =>
                        onSettingChange('colorFront', e.target.value)
                      }
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
                      value={settings.imagedither?.colorFront ?? '#ffffff'}
                      onChange={(e) =>
                        onSettingChange('colorFront', e.target.value)
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
                    Back Color
                  </Field.Label>
                  <HStack gap={2}>
                    <Input
                      type="color"
                      value={settings.imagedither?.colorBack ?? '#000000'}
                      onChange={(e) =>
                        onSettingChange('colorBack', e.target.value)
                      }
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
                      value={settings.imagedither?.colorBack ?? '#000000'}
                      onChange={(e) =>
                        onSettingChange('colorBack', e.target.value)
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
                    Highlight Color
                  </Field.Label>
                  <HStack gap={2}>
                    <Input
                      type="color"
                      value={settings.imagedither?.colorHighlight ?? '#ffffff'}
                      onChange={(e) =>
                        onSettingChange('colorHighlight', e.target.value)
                      }
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
                      value={settings.imagedither?.colorHighlight ?? '#ffffff'}
                      onChange={(e) =>
                        onSettingChange('colorHighlight', e.target.value)
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
              </>
            )}
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Image Fit
              </Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={settings.imagedither?.fit ?? 'contain'}
                  onChange={(e) =>
                    onSettingChange(
                      'fit',
                      e.currentTarget.value as 'contain' | 'cover' | 'fill'
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
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                  <option value="fill">Fill</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Scale
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(settings.imagedither?.scale ?? 1).toFixed(2)}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[settings.imagedither?.scale ?? 1]}
                    onValueChange={(e) => onSettingChange('scale', e.value[0])}
                    min={0.1}
                    max={3}
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
                  value={(settings.imagedither?.scale ?? 1).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('scale', parseFloat(e.value) || 1)
                  }
                  min={0.1}
                  max={3}
                  step={0.01}
                  size="xs"
                  w="70px"
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
                  Rotation
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {settings.imagedither?.rotation ?? 0}°
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[settings.imagedither?.rotation ?? 0]}
                    onValueChange={(e) =>
                      onSettingChange('rotation', e.value[0])
                    }
                    min={-180}
                    max={180}
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
                  value={(settings.imagedither?.rotation ?? 0).toString()}
                  onValueChange={(e) =>
                    onSettingChange('rotation', parseInt(e.value) || 0)
                  }
                  min={-180}
                  max={180}
                  step={1}
                  size="xs"
                  w="70px"
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
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
