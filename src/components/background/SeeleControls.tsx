import {
  SEELE_DEFAULT_BOTTOM_TEXT,
  SEELE_DEFAULT_TOP_TEXT,
  SEELE_FONT_OPTIONS,
} from '@/components/animations/Seele';
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

type SeeleSlice = NonNullable<BackgroundSettings['seele']>;

const FONT_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace";

export interface SeeleControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BackgroundSettings;
  onSettingChange: <K extends keyof SeeleSlice>(
    key: K,
    value: SeeleSlice[K]
  ) => void;
  onSettingsChange: (s: BackgroundSettings) => void;
}

export function SeeleControls({
  open,
  onOpenChange,
  settings,
  onSettingChange,
  onSettingsChange,
}: SeeleControlsProps) {
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
          <Text fontSize="xs">SEELE Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2}>
          <VStack gap={3} align="stretch">
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
                value={
                  settings.seele?.bottomText ?? SEELE_DEFAULT_BOTTOM_TEXT
                }
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
                  value={
                    settings.seele?.fontFamily ?? SEELE_FONT_OPTIONS[0].value
                  }
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
              <HStack gap={2}>
                <Input
                  type="color"
                  value={settings.seele?.textColor ?? '#ff0000'}
                  onChange={(e) =>
                    onSettingChange('textColor', e.target.value)
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
                  value={settings.seele?.textColor ?? '#ff0000'}
                  onChange={(e) =>
                    onSettingChange('textColor', e.target.value)
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
                Background Color
              </Field.Label>
              <HStack gap={2}>
                <Input
                  type="color"
                  value={settings.seele?.bgColor ?? '#000000'}
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
            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Number Size
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {settings.seele?.numberSize ?? 120}px
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[settings.seele?.numberSize ?? 120]}
                    onValueChange={(e) =>
                      onSettingChange('numberSize', e.value[0])
                    }
                    min={60}
                    max={200}
                    step={1}
                    size="sm"
                    w="full"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range bg="rgba(255, 0, 0, 0.5)" />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </Box>
                <NumberInput.Root
                  value={String(settings.seele?.numberSize ?? 120)}
                  onValueChange={(e) =>
                    onSettingChange(
                      'numberSize',
                      parseInt(e.value) || 120
                    )
                  }
                  min={60}
                  max={200}
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
                  Label Size
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {settings.seele?.labelSize ?? 32}px
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[settings.seele?.labelSize ?? 32]}
                    onValueChange={(e) =>
                      onSettingChange('labelSize', e.value[0])
                    }
                    min={16}
                    max={64}
                    step={1}
                    size="sm"
                    w="full"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range bg="rgba(255, 0, 0, 0.5)" />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </Box>
                <NumberInput.Root
                  value={String(settings.seele?.labelSize ?? 32)}
                  onValueChange={(e) =>
                    onSettingChange(
                      'labelSize',
                      parseInt(e.value) || 32
                    )
                  }
                  min={16}
                  max={64}
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
                  Scanline Speed
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(settings.seele?.scanlineSpeed ?? 3).toFixed(1)}s
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[settings.seele?.scanlineSpeed ?? 3]}
                    onValueChange={(e) =>
                      onSettingChange('scanlineSpeed', e.value[0])
                    }
                    min={1.0}
                    max={10.0}
                    step={0.1}
                    size="sm"
                    w="full"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range bg="rgba(255, 0, 0, 0.5)" />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </Box>
                <NumberInput.Root
                  value={(settings.seele?.scanlineSpeed ?? 3).toFixed(1)}
                  onValueChange={(e) =>
                    onSettingChange(
                      'scanlineSpeed',
                      parseFloat(e.value) || 3
                    )
                  }
                  min={1.0}
                  max={10.0}
                  step={0.1}
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
                  Scanline Opacity
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {((settings.seele?.scanlineOpacity ?? 0.3) * 100).toFixed(0)}%
                </Text>
              </HStack>
              <Box w="full" minW={0}>
                <Slider.Root
                  value={[settings.seele?.scanlineOpacity ?? 0.3]}
                  onValueChange={(e) =>
                    onSettingChange('scanlineOpacity', e.value[0])
                  }
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  size="sm"
                  w="full"
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range bg="rgba(255, 0, 0, 0.5)" />
                    </Slider.Track>
                    <Slider.Thumbs />
                  </Slider.Control>
                </Slider.Root>
              </Box>
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Scanline Color
              </Field.Label>
              <HStack gap={2}>
                <Input
                  type="color"
                  value={
                    settings.seele?.scanlineColor ??
                    settings.seele?.textColor ??
                    '#ff0000'
                  }
                  onChange={(e) =>
                    onSettingChange('scanlineColor', e.target.value)
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
                  value={
                    settings.seele?.scanlineColor ??
                    settings.seele?.textColor ??
                    '#ff0000'
                  }
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
                  Pulse Speed
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(settings.seele?.pulseSpeed ?? 2).toFixed(1)}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[settings.seele?.pulseSpeed ?? 2]}
                    onValueChange={(e) =>
                      onSettingChange('pulseSpeed', e.value[0])
                    }
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    size="sm"
                    w="full"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range bg="rgba(255, 0, 0, 0.5)" />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </Box>
                <NumberInput.Root
                  value={(settings.seele?.pulseSpeed ?? 2).toFixed(1)}
                  onValueChange={(e) =>
                    onSettingChange(
                      'pulseSpeed',
                      parseFloat(e.value) || 2
                    )
                  }
                  min={0.5}
                  max={5.0}
                  step={0.1}
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
                  Pulse Intensity
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {((settings.seele?.pulseIntensity ?? 0.1) * 100).toFixed(0)}%
                </Text>
              </HStack>
              <Box w="full" minW={0}>
                <Slider.Root
                  value={[settings.seele?.pulseIntensity ?? 0.1]}
                  onValueChange={(e) =>
                    onSettingChange('pulseIntensity', e.value[0])
                  }
                  min={0.0}
                  max={0.5}
                  step={0.01}
                  size="sm"
                  w="full"
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range bg="rgba(255, 0, 0, 0.5)" />
                    </Slider.Track>
                    <Slider.Thumbs />
                  </Slider.Control>
                </Slider.Root>
              </Box>
            </Field.Root>
            <Field.Root>
              <HStack justify="space-between">
                <Field.Label fontSize="xs" color="gray.400">
                  Show Number
                </Field.Label>
                <Switch.Root
                  checked={settings.seele?.showNumber ?? true}
                  onCheckedChange={(e) =>
                    onSettingChange('showNumber', e.checked)
                  }
                  size="sm"
                  colorPalette="red"
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </HStack>
            </Field.Root>
            {settings.seele?.showNumber !== false && (
              <Field.Root>
                <HStack justify="space-between" mb={2}>
                  <Field.Label fontSize="xs" color="gray.400">
                    SEELE Number
                  </Field.Label>
                  <Text fontSize="xs" color="gray.400">
                    {String(settings.seele?.seeleNumber ?? 1).padStart(2, '0')}
                  </Text>
                </HStack>
                <HStack gap={2} align="center" w="full">
                  <Box flex={1} w="full" minW={0}>
                    <Slider.Root
                      value={[settings.seele?.seeleNumber ?? 1]}
                      onValueChange={(e) =>
                        onSettingChange('seeleNumber', e.value[0])
                      }
                      min={1}
                      max={12}
                      step={1}
                      size="sm"
                      w="full"
                    >
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Range bg="rgba(255, 0, 0, 0.5)" />
                        </Slider.Track>
                        <Slider.Thumbs />
                      </Slider.Control>
                    </Slider.Root>
                  </Box>
                  <NumberInput.Root
                    value={String(settings.seele?.seeleNumber ?? 1)}
                    onValueChange={(e) =>
                      onSettingChange(
                        'seeleNumber',
                        parseInt(e.value) || 1
                      )
                    }
                    min={1}
                    max={12}
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
            )}
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
