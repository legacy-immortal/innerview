import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
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
import {
  THEME_PRESETS,
  rgbToHex,
  type ThemePreset,
} from './backgroundControlUtils';

const FONT_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace";

export type HypnoticColorKey =
  | 'primaryColor1'
  | 'primaryColor2'
  | 'secondaryColor1'
  | 'secondaryColor2'
  | 'tertiaryColor1'
  | 'tertiaryColor2';

export interface HypnoticControlsProps {
  hypnoticSettings: HypnoticBackgroundSettings | undefined;
  updateSetting: <K extends keyof HypnoticBackgroundSettings>(
    key: K,
    value: HypnoticBackgroundSettings[K]
  ) => void;
  applyTheme: (theme: ThemePreset) => void;
  matchesTheme: (theme: ThemePreset) => boolean;
  updateColor: (colorKey: HypnoticColorKey, hex: string) => void;
  intensityOpen: boolean;
  onIntensityOpenChange: (open: boolean) => void;
  breathingOpen: boolean;
  onBreathingOpenChange: (open: boolean) => void;
  particlesOpen: boolean;
  onParticlesOpenChange: (open: boolean) => void;
  colorsOpen: boolean;
  onColorsOpenChange: (open: boolean) => void;
  rotationOpen: boolean;
  onRotationOpenChange: (open: boolean) => void;
}

export function HypnoticControls({
  hypnoticSettings,
  updateSetting,
  applyTheme,
  matchesTheme,
  updateColor,
  intensityOpen,
  onIntensityOpenChange,
  breathingOpen,
  onBreathingOpenChange,
  particlesOpen,
  onParticlesOpenChange,
  colorsOpen,
  onColorsOpenChange,
  rotationOpen,
  onRotationOpenChange,
}: HypnoticControlsProps) {
  return (
    <>
      <Collapsible.Root
        open={intensityOpen}
        onOpenChange={(e) => onIntensityOpenChange(e.open)}
      >
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
            <Text fontSize="xs">Intensity</Text>
            <Text fontSize="xs">{intensityOpen ? '−' : '+'}</Text>
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box pt={2}>
            <Field.Root>
              <HStack justify="space-between" mb={2}>
                <Field.Label fontSize="xs" color="gray.400">
                  Intensity
                </Field.Label>
                <Text fontSize="xs" color="gray.400">
                  {hypnoticSettings
                    ? Math.round(hypnoticSettings.intensity * 100)
                    : 0}
                  %
                </Text>
              </HStack>
              <HStack gap={2} align="center" w="full">
                <Box flex={1} w="full" minW={0}>
                  <Slider.Root
                    value={[hypnoticSettings?.intensity ?? 0.5]}
                    onValueChange={(e) =>
                      updateSetting('intensity', e.value[0])
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
                  value={(hypnoticSettings?.intensity ?? 0.5).toFixed(2)}
                  onValueChange={(e) =>
                    updateSetting('intensity', parseFloat(e.value) || 0)
                  }
                  min={0}
                  max={1}
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
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>

      <Collapsible.Root
        open={breathingOpen}
        onOpenChange={(e) => onBreathingOpenChange(e.open)}
      >
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
            <Text fontSize="xs">Breathing</Text>
            <Text fontSize="xs">{breathingOpen ? '−' : '+'}</Text>
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box pt={2}>
            <VStack gap={3} align="stretch">
              <Switch.Root
                checked={hypnoticSettings?.breathingEnabled ?? false}
                onCheckedChange={(e) =>
                  updateSetting('breathingEnabled', e.checked === true)
                }
                size="sm"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Label fontSize="xs" color="gray.400">
                  Enabled
                </Switch.Label>
              </Switch.Root>

              {hypnoticSettings?.breathingEnabled && (
                <>
                  <Field.Root>
                    <HStack justify="space-between" mb={2}>
                      <Field.Label fontSize="xs" color="gray.400">
                        Speed
                      </Field.Label>
                      <Text fontSize="xs" color="gray.400">
                        {(hypnoticSettings?.breathingSpeed ?? 0.02).toFixed(1)}
                      </Text>
                    </HStack>
                    <HStack gap={2} align="center" w="full">
                      <Box flex={1} w="full" minW={0}>
                        <Slider.Root
                          value={[hypnoticSettings?.breathingSpeed ?? 0.02]}
                          onValueChange={(e) =>
                            updateSetting('breathingSpeed', e.value[0])
                          }
                          min={0.1}
                          max={2.0}
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
                        value={(
                          hypnoticSettings?.breathingSpeed ?? 0.02
                        ).toFixed(1)}
                        onValueChange={(e) =>
                          updateSetting(
                            'breathingSpeed',
                            parseFloat(e.value) || 0.1
                          )
                        }
                        min={0.1}
                        max={2.0}
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
                        Intensity
                      </Field.Label>
                      <Text fontSize="xs" color="gray.400">
                        {Math.round(
                          (hypnoticSettings?.breathingIntensity ?? 0.1) * 100
                        )}
                        %
                      </Text>
                    </HStack>
                    <HStack gap={2} align="center" w="full">
                      <Box flex={1} w="full" minW={0}>
                        <Slider.Root
                          value={[hypnoticSettings?.breathingIntensity ?? 0.1]}
                          onValueChange={(e) =>
                            updateSetting('breathingIntensity', e.value[0])
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
                        value={(
                          hypnoticSettings?.breathingIntensity ?? 0.1
                        ).toFixed(2)}
                        onValueChange={(e) =>
                          updateSetting(
                            'breathingIntensity',
                            parseFloat(e.value) || 0
                          )
                        }
                        min={0}
                        max={0.5}
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
                </>
              )}
            </VStack>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>

      <Collapsible.Root
        open={particlesOpen}
        onOpenChange={(e) => onParticlesOpenChange(e.open)}
      >
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
            <Text fontSize="xs">Particles</Text>
            <Text fontSize="xs">{particlesOpen ? '−' : '+'}</Text>
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box pt={2}>
            <VStack gap={3} align="stretch">
              <Switch.Root
                checked={hypnoticSettings?.particlesEnabled ?? false}
                onCheckedChange={(e) =>
                  updateSetting('particlesEnabled', e.checked === true)
                }
                size="sm"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Label fontSize="xs" color="gray.400">
                  Enabled
                </Switch.Label>
              </Switch.Root>

              {hypnoticSettings?.particlesEnabled && (
                <>
                  <Field.Root>
                    <HStack justify="space-between" mb={2}>
                      <Field.Label fontSize="xs" color="gray.400">
                        Count
                      </Field.Label>
                      <Text fontSize="xs" color="gray.400">
                        {hypnoticSettings?.particlesCount ?? 50}
                      </Text>
                    </HStack>
                    <HStack gap={2} align="center" w="full">
                      <Box flex={1} w="full" minW={0}>
                        <Slider.Root
                          value={[hypnoticSettings?.particlesCount ?? 50]}
                          onValueChange={(e) =>
                            updateSetting(
                              'particlesCount',
                              Math.round(e.value[0])
                            )
                          }
                          min={0}
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
                        value={(
                          hypnoticSettings?.particlesCount ?? 50
                        ).toString()}
                        onValueChange={(e) =>
                          updateSetting(
                            'particlesCount',
                            Math.round(parseFloat(e.value) || 0)
                          )
                        }
                        min={0}
                        max={20}
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
                        Opacity
                      </Field.Label>
                      <Text fontSize="xs" color="gray.400">
                        {Math.round(
                          (hypnoticSettings?.particlesOpacity ?? 0.5) * 100
                        )}
                        %
                      </Text>
                    </HStack>
                    <HStack gap={2} align="center" w="full">
                      <Box flex={1} w="full" minW={0}>
                        <Slider.Root
                          value={[hypnoticSettings?.particlesOpacity ?? 0.5]}
                          onValueChange={(e) =>
                            updateSetting('particlesOpacity', e.value[0])
                          }
                          min={0}
                          max={1}
                          step={0.05}
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
                          hypnoticSettings?.particlesOpacity ?? 0.5
                        ).toFixed(2)}
                        onValueChange={(e) =>
                          updateSetting(
                            'particlesOpacity',
                            parseFloat(e.value) || 0
                          )
                        }
                        min={0}
                        max={1}
                        step={0.05}
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
                </>
              )}
            </VStack>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>

      <Collapsible.Root
        open={colorsOpen}
        onOpenChange={(e) => onColorsOpenChange(e.open)}
      >
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
            <Text fontSize="xs">Colors</Text>
            <Text fontSize="xs">{colorsOpen ? '−' : '+'}</Text>
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box pt={2}>
            <VStack gap={3} align="stretch">
              <Field.Root>
                <Field.Label fontSize="xs" color="gray.400" mb={2}>
                  Theme Presets
                </Field.Label>
                <Box
                  display="grid"
                  gridTemplateColumns={{
                    base: 'repeat(3, 1fr)',
                    md: 'repeat(5, 1fr)',
                  }}
                  gap={2}
                >
                  {THEME_PRESETS.map((theme) => {
                    const isSelected = matchesTheme(theme);
                    return (
                      <Button
                        key={theme.name}
                        variant="ghost"
                        size="xs"
                        p={0}
                        w="100%"
                        aspectRatio="1"
                        onClick={() => applyTheme(theme)}
                        _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                        transition="all 0.2s"
                        position="relative"
                        borderRadius="sm"
                        overflow="hidden"
                        border="2px solid"
                        borderColor={
                          isSelected
                            ? 'rgba(139, 92, 246, 0.8)'
                            : 'rgba(255, 255, 255, 0.1)'
                        }
                        bg="transparent"
                        _active={{ bg: 'transparent' }}
                        _focus={{ bg: 'transparent' }}
                        _focusVisible={{ bg: 'transparent' }}
                        boxShadow={
                          isSelected
                            ? '0 0 8px rgba(139, 92, 246, 0.4)'
                            : 'none'
                        }
                      >
                        <VStack
                          gap={0}
                          w="100%"
                          h="100%"
                          position="relative"
                          zIndex={1}
                          bg="transparent"
                        >
                          <Box
                            w="100%"
                            flex="1"
                            position="relative"
                            bg={`linear-gradient(135deg, ${theme.primaryColor1} 0%, ${theme.primaryColor2} 50%, ${theme.secondaryColor1} 100%)`}
                          />
                          <Box
                            w="100%"
                            flex="0 0 auto"
                            h="20px"
                            position="relative"
                            bg={`linear-gradient(135deg, ${theme.secondaryColor2} 0%, ${theme.tertiaryColor1} 50%, ${theme.tertiaryColor2} 100%)`}
                          />
                          <Text
                            fontSize="2xs"
                            color="gray.300"
                            mt={1}
                            mb={1}
                            px={1}
                            textAlign="center"
                            fontFamily={FONT_FAMILY}
                            bg="transparent"
                          >
                            {theme.name}
                          </Text>
                        </VStack>
                        {isSelected && (
                          <Box
                            position="absolute"
                            top={1}
                            right={1}
                            w="8px"
                            h="8px"
                            borderRadius="full"
                            bg="rgba(139, 92, 246, 1)"
                            boxShadow="0 0 4px rgba(139, 92, 246, 0.8)"
                            zIndex={2}
                          />
                        )}
                      </Button>
                    );
                  })}
                </Box>
              </Field.Root>

              {(
                [
                  ['Primary Color 1', 'primaryColor1'],
                  ['Primary Color 2', 'primaryColor2'],
                  ['Secondary Color 1', 'secondaryColor1'],
                  ['Secondary Color 2', 'secondaryColor2'],
                  ['Tertiary Color 1', 'tertiaryColor1'],
                  ['Tertiary Color 2', 'tertiaryColor2'],
                ] as const
              ).map(([label, key]) => (
                <Field.Root key={key}>
                  <Field.Label fontSize="xs" color="gray.400" mb={1}>
                    {label}
                  </Field.Label>
                  <HStack gap={2}>
                    <Input
                      type="color"
                      value={rgbToHex(hypnoticSettings?.[key])}
                      onChange={(e) => updateColor(key, e.target.value)}
                      w="60px"
                      h="32px"
                      p={0}
                      border="1px solid"
                      borderColor="rgba(255, 255, 255, 0.1)"
                      borderRadius="sm"
                      cursor="pointer"
                    />
                    <Input
                      type="text"
                      value={rgbToHex(hypnoticSettings?.[key]).toUpperCase()}
                      onChange={(e) => {
                        const hex = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                          updateColor(key, hex);
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
              ))}
            </VStack>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>

      <Collapsible.Root
        open={rotationOpen}
        onOpenChange={(e) => onRotationOpenChange(e.open)}
      >
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
            <Text fontSize="xs">Rotation</Text>
            <Text fontSize="xs">{rotationOpen ? '−' : '+'}</Text>
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box pt={2}>
            <VStack gap={3} align="stretch">
              {(
                [
                  ['Primary Layer Speed', 'rotationSpeed1'],
                  ['Secondary Layer Speed', 'rotationSpeed2'],
                  ['Tertiary Layer Speed', 'rotationSpeed3'],
                ] as const
              ).map(([label, key]) => (
                <Field.Root key={key}>
                  <HStack justify="space-between" mb={2}>
                    <Field.Label fontSize="xs" color="gray.400">
                      {label}
                    </Field.Label>
                    <Text fontSize="xs" color="gray.400">
                      {(hypnoticSettings?.[key] ?? 0.1).toFixed(4)}
                    </Text>
                  </HStack>
                  <HStack gap={2} align="center" w="full">
                    <Box flex={1} w="full" minW={0}>
                      <Slider.Root
                        value={[hypnoticSettings?.[key] ?? 0.1]}
                        onValueChange={(e) => updateSetting(key, e.value[0])}
                        min={0}
                        max={0.5}
                        step={0.001}
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
                      value={(hypnoticSettings?.[key] ?? 0.1).toFixed(4)}
                      onValueChange={(e) =>
                        updateSetting(key, parseFloat(e.value) || 0)
                      }
                      min={0}
                      max={0.5}
                      step={0.001}
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
              ))}
            </VStack>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </>
  );
}
