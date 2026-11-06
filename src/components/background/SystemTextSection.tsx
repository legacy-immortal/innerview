import type { SystemTextAnimationSettings } from '@/lib/settings-types';
import {
  Box,
  Button,
  Collapsible,
  Field,
  HStack,
  Slider,
  Text,
  VStack,
} from '@chakra-ui/react';

interface SystemTextSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemText: SystemTextAnimationSettings;
  onSystemTextChange: <K extends keyof SystemTextAnimationSettings>(
    key: K,
    value: SystemTextAnimationSettings[K]
  ) => void;
}

export function SystemTextSection({
  open,
  onOpenChange,
  systemText,
  onSystemTextChange,
}: SystemTextSectionProps) {
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
          <Text fontSize="xs">System text</Text>
          <Text fontSize="xs">{open ? '−' : '+'}</Text>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box
          pt={2}
          pb={3}
          px={3}
          borderBottom="1px solid"
          borderColor="rgba(255, 255, 255, 0.1)"
        >
          <VStack gap={3} align="stretch">
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.300" mb={2}>
                Appear (ms)
              </Field.Label>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[systemText.appearDurationMs]}
                    onValueChange={(e) =>
                      onSystemTextChange(
                        'appearDurationMs',
                        Math.round(e.value[0])
                      )
                    }
                    min={0}
                    max={500}
                    step={10}
                    w="full"
                    colorPalette="cyan"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumb index={0} />
                    </Slider.Control>
                  </Slider.Root>
                </Box>
                <Text
                  fontSize="xs"
                  color="gray.400"
                  minW="40px"
                  textAlign="right"
                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                >
                  {systemText.appearDurationMs}
                </Text>
              </HStack>
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.300" mb={2}>
                Hold (s)
              </Field.Label>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[systemText.holdDurationS]}
                    onValueChange={(e) =>
                      onSystemTextChange('holdDurationS', e.value[0])
                    }
                    min={0.5}
                    max={10}
                    step={0.5}
                    w="full"
                    colorPalette="cyan"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumb index={0} />
                    </Slider.Control>
                  </Slider.Root>
                </Box>
                <Text
                  fontSize="xs"
                  color="gray.400"
                  minW="40px"
                  textAlign="right"
                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                >
                  {systemText.holdDurationS.toFixed(1)}
                </Text>
              </HStack>
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.300" mb={2}>
                Fade out (s)
              </Field.Label>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[systemText.fadeOutDurationS]}
                    onValueChange={(e) =>
                      onSystemTextChange('fadeOutDurationS', e.value[0])
                    }
                    min={1}
                    max={10}
                    step={0.5}
                    w="full"
                    colorPalette="cyan"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumb index={0} />
                    </Slider.Control>
                  </Slider.Root>
                </Box>
                <Text
                  fontSize="xs"
                  color="gray.400"
                  minW="40px"
                  textAlign="right"
                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                >
                  {systemText.fadeOutDurationS.toFixed(1)}
                </Text>
              </HStack>
            </Field.Root>
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
