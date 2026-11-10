/**
 * @file Waveform background section: enable toggle, nested collapsibles, and per-layer waveform settings.
 * @module background/panels/WaveformSection
 *
 * Re-exports waveform types for compatibility.
 */
import {
  Box,
  Button,
  Collapsible,
  Field,
  HStack,
  IconButton,
  Input,
  NumberInput,
  Slider,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { memo, useState, type JSX } from 'react';
import { HiPlus, HiTrash } from 'react-icons/hi';
import { DEFAULT_COLORS } from '../backgroundControlUtils';
import { FONT_FAMILY } from '../controlFields';
import type { WaveformLayer, WaveformSettings } from './waveformTypes';

export type { WaveformLayer, WaveformSettings } from './waveformTypes';

export interface WaveformSectionProps {
  readonly waveformLayers?: WaveformLayer[];
  readonly onWaveformLayersChange?: (layers: WaveformLayer[]) => void;
  readonly waveformSettings?: WaveformSettings;
  readonly onWaveformSettingsChange?: (settings: WaveformSettings) => void;
  readonly onLocalWaveformSettingsChange?: (settings: WaveformSettings) => void;
  readonly waveformEnabled?: boolean;
  readonly onWaveformEnabledChange?: (enabled: boolean) => void;
}

const DEFAULT_WAVEFORM_SETTINGS: WaveformSettings = {
  pointCount: 256,
  breathingEnabled: true,
  breathingSpeed: 0.02,
  breathingIntensity: 0.15,
  radius: 0.25,
  barWidth: 0.02,
  barLengthMultiplier: 0.5,
  animationSpeed: 0.5,
  animationSpeedIrregular: 0.3,
  animationSpeedHighFreq: 0.6,
  amplitudePowerAudio: 0.7,
  amplitudePowerSynthetic: 0.75,
  glowOpacityBase: 0.15,
  glowOpacityRange: 0.08,
};

const WaveformSectionComponent = ({
  waveformLayers = [],
  onWaveformLayersChange,
  waveformSettings,
  onWaveformSettingsChange,
  onLocalWaveformSettingsChange,
  waveformEnabled = true,
  onWaveformEnabledChange,
}: WaveformSectionProps): JSX.Element => {
  const [waveformSettingsOpen, setWaveformSettingsOpen] = useState(false);
  const [waveformBreathingOpen, setWaveformBreathingOpen] = useState(false);
  const [waveformAnimationOpen, setWaveformAnimationOpen] = useState(false);
  const [waveformAmplitudeOpen, setWaveformAmplitudeOpen] = useState(false);
  const [waveformGlowOpen, setWaveformGlowOpen] = useState(false);
  const [waveformLayersOpen, setWaveformLayersOpen] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

  const safeWaveformSettings = waveformSettings ?? DEFAULT_WAVEFORM_SETTINGS;

  const updateWaveformSetting = <K extends keyof WaveformSettings>(
    key: K,
    value: WaveformSettings[K]
  ): void => {
    if (!waveformSettings || !onWaveformSettingsChange) return;
    onWaveformSettingsChange({ ...waveformSettings, [key]: value });
    if (onLocalWaveformSettingsChange) {
      onLocalWaveformSettingsChange({ ...waveformSettings, [key]: value });
    }
  };

  const updateWaveformLayer = (
    layerId: string,
    updates: Partial<WaveformLayer>
  ): void => {
    if (!onWaveformLayersChange) return;
    const updated = waveformLayers.map((layer) =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    );
    onWaveformLayersChange(updated);
  };

  const addWaveformLayer = (): void => {
    if (!onWaveformLayersChange) return;
    const newLayer: WaveformLayer = {
      id: `layer-${Date.now()}`,
      color: DEFAULT_COLORS[waveformLayers.length % DEFAULT_COLORS.length],
      offset: waveformLayers.length * 0.05,
      amplitude: 0.3,
      frequency: 3.0,
      phase: (waveformLayers.length * Math.PI) / 4,
    };
    onWaveformLayersChange([...waveformLayers, newLayer]);
  };

  const removeWaveformLayer = (layerId: string): void => {
    if (!onWaveformLayersChange || waveformLayers.length <= 1) return;
    onWaveformLayersChange(waveformLayers.filter((l) => l.id !== layerId));
    const newExpanded = new Set(expandedLayers);
    newExpanded.delete(layerId);
    setExpandedLayers(newExpanded);
  };

  const toggleLayerExpanded = (layerId: string): void => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  return (
    <>
      {waveformSettings && (
        <>
          {/* Waveform Enable/Disable Toggle */}
          <Box
            px={3}
            py={2}
            borderBottom="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
          >
            <HStack justify="space-between" align="center">
              <Text fontSize="xs" color="gray.300" fontFamily={FONT_FAMILY}>
                Waveform Enabled
              </Text>
              <Switch.Root
                checked={waveformEnabled}
                onCheckedChange={(e) => {
                  if (onWaveformEnabledChange) {
                    onWaveformEnabledChange(e.checked);
                  }
                }}
                size="sm"
                colorPalette="purple"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>
          </Box>

          <Collapsible.Root
            open={waveformSettingsOpen}
            onOpenChange={(e) => setWaveformSettingsOpen(e.open)}
          >
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
                <Text fontSize="xs">Waveform Settings</Text>
                <Text fontSize="xs">{waveformSettingsOpen ? '−' : '+'}</Text>
              </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box pt={2} maxW="100%" overflowX="hidden" boxSizing="border-box">
                <VStack gap={4} align="stretch">
                  {/* Waveform Settings */}
                  <Box>
                    <Text
                      fontSize="2xs"
                      color="gray.400"
                      mb={2}
                      fontWeight={600}
                    >
                      Settings
                    </Text>
                    <VStack gap={3} align="stretch" pl={2}>
                      <Field.Root>
                        <HStack justify="space-between" mb={2}>
                          <Field.Label fontSize="2xs" color="gray.500">
                            Points
                          </Field.Label>
                          <Text fontSize="2xs" color="gray.500">
                            {safeWaveformSettings.pointCount}
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
                              value={[safeWaveformSettings.pointCount]}
                              onValueChange={(e) =>
                                updateWaveformSetting(
                                  'pointCount',
                                  Math.round(e.value[0])
                                )
                              }
                              min={0}
                              max={512}
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
                            value={safeWaveformSettings.pointCount.toString()}
                            onValueChange={(e) =>
                              updateWaveformSetting(
                                'pointCount',
                                Math.round(parseFloat(e.value) || 0)
                              )
                            }
                            min={0}
                            max={512}
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
                          <Field.Label fontSize="2xs" color="gray.500">
                            Radius
                          </Field.Label>
                          <Text fontSize="2xs" color="gray.500">
                            {Math.round(safeWaveformSettings.radius * 100)}%
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
                              value={[safeWaveformSettings.radius]}
                              onValueChange={(e) =>
                                updateWaveformSetting('radius', e.value[0])
                              }
                              min={0.01}
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
                            value={safeWaveformSettings.radius.toFixed(2)}
                            onValueChange={(e) =>
                              updateWaveformSetting(
                                'radius',
                                parseFloat(e.value) || 0.01
                              )
                            }
                            min={0.01}
                            max={0.5}
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
                          <Field.Label fontSize="2xs" color="gray.500">
                            Bar Width
                          </Field.Label>
                          <Text fontSize="2xs" color="gray.500">
                            {safeWaveformSettings.barWidth.toFixed(3)}
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
                              value={[safeWaveformSettings.barWidth]}
                              onValueChange={(e) =>
                                updateWaveformSetting('barWidth', e.value[0])
                              }
                              min={0.001}
                              max={0.1}
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
                            value={safeWaveformSettings.barWidth.toFixed(3)}
                            onValueChange={(e) =>
                              updateWaveformSetting(
                                'barWidth',
                                parseFloat(e.value) || 0.001
                              )
                            }
                            min={0.001}
                            max={0.1}
                            step={0.001}
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
                          <Field.Label fontSize="2xs" color="gray.500">
                            Bar Length
                          </Field.Label>
                          <Text fontSize="2xs" color="gray.500">
                            {Math.round(
                              safeWaveformSettings.barLengthMultiplier * 100
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
                              value={[safeWaveformSettings.barLengthMultiplier]}
                              onValueChange={(e) =>
                                updateWaveformSetting(
                                  'barLengthMultiplier',
                                  e.value[0]
                                )
                              }
                              min={0.01}
                              max={1.0}
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
                            value={safeWaveformSettings.barLengthMultiplier.toFixed(
                              2
                            )}
                            onValueChange={(e) =>
                              updateWaveformSetting(
                                'barLengthMultiplier',
                                parseFloat(e.value) || 0.01
                              )
                            }
                            min={0.01}
                            max={1.0}
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
                    </VStack>
                  </Box>

                  {/* Waveform Breathing */}
                  <Collapsible.Root
                    open={waveformBreathingOpen}
                    onOpenChange={(e) => setWaveformBreathingOpen(e.open)}
                  >
                    <Collapsible.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        w="100%"
                        maxW="100%"
                        justifyContent="space-between"
                        color="gray.400"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                        fontFamily={FONT_FAMILY}
                        fontSize="2xs"
                      >
                        <Text fontSize="2xs">Breathing</Text>
                        <Text fontSize="2xs">
                          {waveformBreathingOpen ? '−' : '+'}
                        </Text>
                      </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <Box
                        pt={2}
                        maxW="100%"
                        overflowX="hidden"
                        boxSizing="border-box"
                      >
                        <VStack gap={3} align="stretch">
                          <Switch.Root
                            checked={safeWaveformSettings.breathingEnabled}
                            onCheckedChange={(e) =>
                              updateWaveformSetting(
                                'breathingEnabled',
                                e.checked === true
                              )
                            }
                            size="sm"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                            <Switch.Label fontSize="2xs" color="gray.500">
                              Enabled
                            </Switch.Label>
                          </Switch.Root>

                          {safeWaveformSettings.breathingEnabled && (
                            <>
                              <Field.Root>
                                <HStack justify="space-between" mb={2}>
                                  <Field.Label fontSize="2xs" color="gray.500">
                                    Speed
                                  </Field.Label>
                                  <Text fontSize="2xs" color="gray.500">
                                    {safeWaveformSettings.breathingSpeed.toFixed(
                                      3
                                    )}
                                  </Text>
                                </HStack>
                                <HStack
                                  gap={2}
                                  align="center"
                                  w="full"
                                  maxW="100%"
                                  flexWrap={{
                                    base: 'wrap',
                                    sm: 'nowrap',
                                  }}
                                  touchAction="none"
                                >
                                  <Box
                                    flex={1}
                                    w="full"
                                    minW={0}
                                    maxW="100%"
                                    flexBasis={{
                                      base: '100%',
                                      sm: 'auto',
                                    }}
                                  >
                                    <Slider.Root
                                      touchAction="none"
                                      value={[
                                        safeWaveformSettings.breathingSpeed,
                                      ]}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'breathingSpeed',
                                          e.value[0]
                                        )
                                      }
                                      min={0.005}
                                      max={0.1}
                                      step={0.005}
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
                                    value={safeWaveformSettings.breathingSpeed.toFixed(
                                      3
                                    )}
                                    onValueChange={(e) =>
                                      updateWaveformSetting(
                                        'breathingSpeed',
                                        parseFloat(e.value) || 0.005
                                      )
                                    }
                                    min={0.005}
                                    max={0.1}
                                    step={0.005}
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
                                  <Field.Label fontSize="2xs" color="gray.500">
                                    Intensity
                                  </Field.Label>
                                  <Text fontSize="2xs" color="gray.500">
                                    {Math.round(
                                      safeWaveformSettings.breathingIntensity *
                                        100
                                    )}
                                    %
                                  </Text>
                                </HStack>
                                <HStack
                                  gap={2}
                                  align="center"
                                  w="full"
                                  maxW="100%"
                                  flexWrap={{
                                    base: 'wrap',
                                    sm: 'nowrap',
                                  }}
                                  touchAction="none"
                                >
                                  <Box
                                    flex={1}
                                    w="full"
                                    minW={0}
                                    maxW="100%"
                                    flexBasis={{
                                      base: '100%',
                                      sm: 'auto',
                                    }}
                                  >
                                    <Slider.Root
                                      touchAction="none"
                                      value={[
                                        safeWaveformSettings.breathingIntensity,
                                      ]}
                                      onValueChange={(e) =>
                                        updateWaveformSetting(
                                          'breathingIntensity',
                                          e.value[0]
                                        )
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
                                    value={safeWaveformSettings.breathingIntensity.toFixed(
                                      2
                                    )}
                                    onValueChange={(e) =>
                                      updateWaveformSetting(
                                        'breathingIntensity',
                                        parseFloat(e.value) || 0
                                      )
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

                  {/* Waveform Animation */}
                  <Collapsible.Root
                    open={waveformAnimationOpen}
                    onOpenChange={(e) => setWaveformAnimationOpen(e.open)}
                  >
                    <Collapsible.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        w="100%"
                        maxW="100%"
                        justifyContent="space-between"
                        color="gray.400"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                        fontFamily={FONT_FAMILY}
                        fontSize="2xs"
                      >
                        <Text fontSize="2xs">Animation</Text>
                        <Text fontSize="2xs">
                          {waveformAnimationOpen ? '−' : '+'}
                        </Text>
                      </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <Box
                        pt={2}
                        maxW="100%"
                        overflowX="hidden"
                        boxSizing="border-box"
                      >
                        <VStack gap={3} align="stretch">
                          <Field.Root>
                            <HStack justify="space-between" mb={2}>
                              <Field.Label fontSize="2xs" color="gray.500">
                                Base Speed
                              </Field.Label>
                              <Text fontSize="2xs" color="gray.500">
                                {safeWaveformSettings.animationSpeed.toFixed(1)}
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
                                  value={[safeWaveformSettings.animationSpeed]}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'animationSpeed',
                                      e.value[0]
                                    )
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
                                value={safeWaveformSettings.animationSpeed.toFixed(
                                  1
                                )}
                                onValueChange={(e) =>
                                  updateWaveformSetting(
                                    'animationSpeed',
                                    parseFloat(e.value) || 0.1
                                  )
                                }
                                min={0.1}
                                max={2.0}
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

                          <Field.Root>
                            <HStack justify="space-between" mb={2}>
                              <Field.Label fontSize="2xs" color="gray.500">
                                Irregular Speed
                              </Field.Label>
                              <Text fontSize="2xs" color="gray.500">
                                {safeWaveformSettings.animationSpeedIrregular.toFixed(
                                  1
                                )}
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
                                  value={[
                                    safeWaveformSettings.animationSpeedIrregular,
                                  ]}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'animationSpeedIrregular',
                                      e.value[0]
                                    )
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
                                value={safeWaveformSettings.animationSpeedIrregular.toFixed(
                                  1
                                )}
                                onValueChange={(e) =>
                                  updateWaveformSetting(
                                    'animationSpeedIrregular',
                                    parseFloat(e.value) || 0.1
                                  )
                                }
                                min={0.1}
                                max={2.0}
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

                          <Field.Root>
                            <HStack justify="space-between" mb={2}>
                              <Field.Label fontSize="2xs" color="gray.500">
                                High Freq Speed
                              </Field.Label>
                              <Text fontSize="2xs" color="gray.500">
                                {safeWaveformSettings.animationSpeedHighFreq.toFixed(
                                  1
                                )}
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
                                  value={[
                                    safeWaveformSettings.animationSpeedHighFreq,
                                  ]}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'animationSpeedHighFreq',
                                      e.value[0]
                                    )
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
                                value={safeWaveformSettings.animationSpeedHighFreq.toFixed(
                                  1
                                )}
                                onValueChange={(e) =>
                                  updateWaveformSetting(
                                    'animationSpeedHighFreq',
                                    parseFloat(e.value) || 0.1
                                  )
                                }
                                min={0.1}
                                max={2.0}
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
                        </VStack>
                      </Box>
                    </Collapsible.Content>
                  </Collapsible.Root>

                  {/* Waveform Amplitude */}
                  <Collapsible.Root
                    open={waveformAmplitudeOpen}
                    onOpenChange={(e) => setWaveformAmplitudeOpen(e.open)}
                  >
                    <Collapsible.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        w="100%"
                        maxW="100%"
                        justifyContent="space-between"
                        color="gray.400"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                        fontFamily={FONT_FAMILY}
                        fontSize="2xs"
                      >
                        <Text fontSize="2xs">Amplitude</Text>
                        <Text fontSize="2xs">
                          {waveformAmplitudeOpen ? '−' : '+'}
                        </Text>
                      </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <Box
                        pt={2}
                        maxW="100%"
                        overflowX="hidden"
                        boxSizing="border-box"
                      >
                        <VStack gap={3} align="stretch">
                          <Field.Root>
                            <HStack justify="space-between" mb={2}>
                              <Field.Label fontSize="2xs" color="gray.500">
                                Audio Power
                              </Field.Label>
                              <Text fontSize="2xs" color="gray.500">
                                {safeWaveformSettings.amplitudePowerAudio.toFixed(
                                  2
                                )}
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
                                  value={[
                                    safeWaveformSettings.amplitudePowerAudio,
                                  ]}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'amplitudePowerAudio',
                                      e.value[0]
                                    )
                                  }
                                  min={0.1}
                                  max={1.5}
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
                                value={safeWaveformSettings.amplitudePowerAudio.toFixed(
                                  2
                                )}
                                onValueChange={(e) =>
                                  updateWaveformSetting(
                                    'amplitudePowerAudio',
                                    parseFloat(e.value) || 0.1
                                  )
                                }
                                min={0.1}
                                max={1.5}
                                step={0.05}
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
                              <Field.Label fontSize="2xs" color="gray.500">
                                Synthetic Power
                              </Field.Label>
                              <Text fontSize="2xs" color="gray.500">
                                {safeWaveformSettings.amplitudePowerSynthetic.toFixed(
                                  2
                                )}
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
                                  value={[
                                    safeWaveformSettings.amplitudePowerSynthetic,
                                  ]}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'amplitudePowerSynthetic',
                                      e.value[0]
                                    )
                                  }
                                  min={0.1}
                                  max={1.5}
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
                                value={safeWaveformSettings.amplitudePowerSynthetic.toFixed(
                                  2
                                )}
                                onValueChange={(e) =>
                                  updateWaveformSetting(
                                    'amplitudePowerSynthetic',
                                    parseFloat(e.value) || 0.1
                                  )
                                }
                                min={0.1}
                                max={1.5}
                                step={0.05}
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
                        </VStack>
                      </Box>
                    </Collapsible.Content>
                  </Collapsible.Root>

                  {/* Waveform Glow */}
                  <Collapsible.Root
                    open={waveformGlowOpen}
                    onOpenChange={(e) => setWaveformGlowOpen(e.open)}
                  >
                    <Collapsible.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        w="100%"
                        maxW="100%"
                        justifyContent="space-between"
                        color="gray.400"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                        fontFamily={FONT_FAMILY}
                        fontSize="2xs"
                      >
                        <Text fontSize="2xs">Glow</Text>
                        <Text fontSize="2xs">
                          {waveformGlowOpen ? '−' : '+'}
                        </Text>
                      </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <Box
                        pt={2}
                        maxW="100%"
                        overflowX="hidden"
                        boxSizing="border-box"
                      >
                        <VStack gap={3} align="stretch">
                          <Field.Root>
                            <HStack justify="space-between" mb={2}>
                              <Field.Label fontSize="2xs" color="gray.500">
                                Base Opacity
                              </Field.Label>
                              <Text fontSize="2xs" color="gray.500">
                                {safeWaveformSettings.glowOpacityBase.toFixed(
                                  2
                                )}
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
                                  value={[safeWaveformSettings.glowOpacityBase]}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'glowOpacityBase',
                                      e.value[0]
                                    )
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
                                value={safeWaveformSettings.glowOpacityBase.toFixed(
                                  2
                                )}
                                onValueChange={(e) =>
                                  updateWaveformSetting(
                                    'glowOpacityBase',
                                    parseFloat(e.value) || 0
                                  )
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
                              <Field.Label fontSize="2xs" color="gray.500">
                                Opacity Range
                              </Field.Label>
                              <Text fontSize="2xs" color="gray.500">
                                {safeWaveformSettings.glowOpacityRange.toFixed(
                                  2
                                )}
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
                                  value={[
                                    safeWaveformSettings.glowOpacityRange,
                                  ]}
                                  onValueChange={(e) =>
                                    updateWaveformSetting(
                                      'glowOpacityRange',
                                      e.value[0]
                                    )
                                  }
                                  min={0}
                                  max={0.2}
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
                                value={safeWaveformSettings.glowOpacityRange.toFixed(
                                  2
                                )}
                                onValueChange={(e) =>
                                  updateWaveformSetting(
                                    'glowOpacityRange',
                                    parseFloat(e.value) || 0
                                  )
                                }
                                min={0}
                                max={0.2}
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
                        </VStack>
                      </Box>
                    </Collapsible.Content>
                  </Collapsible.Root>

                  {/* Waveform Layers */}
                  <Collapsible.Root
                    open={waveformLayersOpen}
                    onOpenChange={(e) => setWaveformLayersOpen(e.open)}
                  >
                    <Collapsible.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        w="100%"
                        maxW="100%"
                        justifyContent="space-between"
                        color="gray.400"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.03)' }}
                        fontFamily={FONT_FAMILY}
                        fontSize="2xs"
                      >
                        <Text fontSize="2xs">
                          Layers ({waveformLayers.length})
                        </Text>
                        <Text fontSize="2xs">
                          {waveformLayersOpen ? '−' : '+'}
                        </Text>
                      </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <Box
                        pt={2}
                        maxW="100%"
                        overflowX="hidden"
                        boxSizing="border-box"
                      >
                        <VStack gap={2} align="stretch">
                          {waveformLayers.map((layer, index) => {
                            const isExpanded = expandedLayers.has(layer.id);
                            return (
                              <Box
                                key={layer.id}
                                border="1px solid"
                                borderColor="rgba(255, 255, 255, 0.1)"
                                borderRadius="sm"
                                p={2}
                              >
                                <HStack
                                  justify="space-between"
                                  mb={isExpanded ? 2 : 0}
                                >
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() =>
                                      toggleLayerExpanded(layer.id)
                                    }
                                    color="gray.400"
                                    _hover={{
                                      bg: 'rgba(255, 255, 255, 0.03)',
                                    }}
                                    fontFamily={FONT_FAMILY}
                                    fontSize="2xs"
                                  >
                                    <Text fontSize="2xs">
                                      Layer {index + 1} {isExpanded ? '−' : '+'}
                                    </Text>
                                  </Button>
                                  {waveformLayers.length > 1 && (
                                    <IconButton
                                      aria-label="Remove layer"
                                      size="xs"
                                      variant="ghost"
                                      colorPalette="red"
                                      onClick={() =>
                                        removeWaveformLayer(layer.id)
                                      }
                                    >
                                      <HiTrash />
                                    </IconButton>
                                  )}
                                </HStack>
                                {isExpanded && (
                                  <VStack gap={2} align="stretch" mt={2}>
                                    <Field.Root>
                                      <Field.Label
                                        fontSize="2xs"
                                        color="gray.500"
                                        mb={1}
                                      >
                                        Color
                                      </Field.Label>
                                      <HStack
                                        gap={2}
                                        w="full"
                                        minW={0}
                                        maxW="100%"
                                        flexWrap={{
                                          base: 'wrap',
                                          sm: 'nowrap',
                                        }}
                                      >
                                        <Input
                                          type="color"
                                          value={layer.color}
                                          onChange={(e) =>
                                            updateWaveformLayer(layer.id, {
                                              color: e.target.value,
                                            })
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
                                          value={layer.color.toUpperCase()}
                                          onChange={(e) => {
                                            const hex = e.target.value;
                                            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                                              updateWaveformLayer(layer.id, {
                                                color: hex,
                                              });
                                            }
                                          }}
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
                                        <Field.Label
                                          fontSize="2xs"
                                          color="gray.500"
                                        >
                                          Offset
                                        </Field.Label>
                                        <Text fontSize="2xs" color="gray.500">
                                          {layer.offset.toFixed(2)}
                                        </Text>
                                      </HStack>
                                      <HStack gap={2} align="center" w="full">
                                        <Box
                                          flex={1}
                                          w="full"
                                          minW={0}
                                          maxW="100%"
                                          flexBasis={{
                                            base: '100%',
                                            sm: 'auto',
                                          }}
                                        >
                                          <Slider.Root
                                            touchAction="none"
                                            value={[layer.offset]}
                                            onValueChange={(e) =>
                                              updateWaveformLayer(layer.id, {
                                                offset: e.value[0],
                                              })
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
                                          value={layer.offset.toFixed(2)}
                                          onValueChange={(e) =>
                                            updateWaveformLayer(layer.id, {
                                              offset: parseFloat(e.value) || 0,
                                            })
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
                                        <Field.Label
                                          fontSize="2xs"
                                          color="gray.500"
                                        >
                                          Amplitude
                                        </Field.Label>
                                        <Text fontSize="2xs" color="gray.500">
                                          {layer.amplitude.toFixed(2)}
                                        </Text>
                                      </HStack>
                                      <HStack gap={2} align="center" w="full">
                                        <Box
                                          flex={1}
                                          w="full"
                                          minW={0}
                                          maxW="100%"
                                          flexBasis={{
                                            base: '100%',
                                            sm: 'auto',
                                          }}
                                        >
                                          <Slider.Root
                                            touchAction="none"
                                            value={[layer.amplitude]}
                                            onValueChange={(e) =>
                                              updateWaveformLayer(layer.id, {
                                                amplitude: e.value[0],
                                              })
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
                                          value={layer.amplitude.toFixed(2)}
                                          onValueChange={(e) =>
                                            updateWaveformLayer(layer.id, {
                                              amplitude:
                                                parseFloat(e.value) || 0,
                                            })
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

                                    <Field.Root>
                                      <HStack justify="space-between" mb={2}>
                                        <Field.Label
                                          fontSize="2xs"
                                          color="gray.500"
                                        >
                                          Frequency
                                        </Field.Label>
                                        <Text fontSize="2xs" color="gray.500">
                                          {layer.frequency.toFixed(1)}
                                        </Text>
                                      </HStack>
                                      <HStack gap={2} align="center" w="full">
                                        <Box
                                          flex={1}
                                          w="full"
                                          minW={0}
                                          maxW="100%"
                                          flexBasis={{
                                            base: '100%',
                                            sm: 'auto',
                                          }}
                                        >
                                          <Slider.Root
                                            touchAction="none"
                                            value={[layer.frequency]}
                                            onValueChange={(e) =>
                                              updateWaveformLayer(layer.id, {
                                                frequency: e.value[0],
                                              })
                                            }
                                            min={1}
                                            max={6}
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
                                          value={layer.frequency.toFixed(1)}
                                          onValueChange={(e) =>
                                            updateWaveformLayer(layer.id, {
                                              frequency:
                                                parseFloat(e.value) || 1,
                                            })
                                          }
                                          min={1}
                                          max={6}
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

                                    <Field.Root>
                                      <HStack justify="space-between" mb={2}>
                                        <Field.Label
                                          fontSize="2xs"
                                          color="gray.500"
                                        >
                                          Phase
                                        </Field.Label>
                                        <Text fontSize="2xs" color="gray.500">
                                          {(layer.phase / Math.PI).toFixed(1)}π
                                        </Text>
                                      </HStack>
                                      <HStack gap={2} align="center" w="full">
                                        <Box
                                          flex={1}
                                          w="full"
                                          minW={0}
                                          maxW="100%"
                                          flexBasis={{
                                            base: '100%',
                                            sm: 'auto',
                                          }}
                                        >
                                          <Slider.Root
                                            touchAction="none"
                                            value={[layer.phase]}
                                            onValueChange={(e) =>
                                              updateWaveformLayer(layer.id, {
                                                phase: e.value[0],
                                              })
                                            }
                                            min={0}
                                            max={Math.PI * 2}
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
                                            layer.phase / Math.PI
                                          ).toFixed(2)}
                                          onValueChange={(e) =>
                                            updateWaveformLayer(layer.id, {
                                              phase:
                                                parseFloat(e.value) * Math.PI ||
                                                0,
                                            })
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
                                  </VStack>
                                )}
                              </Box>
                            );
                          })}
                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="gray"
                            onClick={addWaveformLayer}
                            fontFamily={FONT_FAMILY}
                            fontSize="2xs"
                          >
                            <HiPlus />
                            Add Layer
                          </Button>
                        </VStack>
                      </Box>
                    </Collapsible.Content>
                  </Collapsible.Root>
                </VStack>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        </>
      )}
    </>
  );
};

/** Waveform background section with enable toggle, settings, and per-layer controls. */
export const WaveformSection = memo(WaveformSectionComponent);
