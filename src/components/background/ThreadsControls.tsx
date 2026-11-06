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

type ThreadsSettings = NonNullable<BackgroundSettings['threads']>;

interface ThreadsControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BackgroundSettings;
  onSettingChange: <K extends keyof ThreadsSettings>(
    key: K,
    value: ThreadsSettings[K]
  ) => void;
}

function threadsColorToHex(
  color: [number, number, number] | undefined
): string {
  if (!color) return '#FFFFFF';
  return `#${color
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

export function ThreadsControls({
  open,
  onOpenChange,
  settings,
  onSettingChange,
}: ThreadsControlsProps) {
  const threads = settings.threads;

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
          <Text fontSize="xs">Threads Settings</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box pt={2}>
          <VStack gap={3} align="stretch">
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.400" mb={2}>
                Color
              </Field.Label>
              <HStack gap={2}>
                <Input
                  type="color"
                  value={threadsColorToHex(threads?.color)}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                    onSettingChange('color', [r, g, b]);
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
                  value={threadsColorToHex(threads?.color).toUpperCase()}
                  onChange={(e) => {
                    const hex = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                      const r = parseInt(hex.slice(1, 3), 16) / 255;
                      const g = parseInt(hex.slice(3, 5), 16) / 255;
                      const b = parseInt(hex.slice(5, 7), 16) / 255;
                      onSettingChange('color', [r, g, b]);
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
                  Amplitude
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(threads?.amplitude ?? 0.5).toFixed(2)}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[threads?.amplitude ?? 0.5]}
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
                  value={(threads?.amplitude ?? 0.5).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('amplitude', parseFloat(e.value) || 0)
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

            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Distance
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {(threads?.distance ?? 0.5).toFixed(2)}
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[threads?.distance ?? 0.5]}
                    onValueChange={(e) =>
                      onSettingChange('distance', e.value[0])
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
                  value={(threads?.distance ?? 0.5).toFixed(2)}
                  onValueChange={(e) =>
                    onSettingChange('distance', parseFloat(e.value) || 0)
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
              checked={threads?.enableMouseInteraction ?? true}
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
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
