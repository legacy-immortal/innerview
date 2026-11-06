import { memo } from 'react';
import {
  VStack,
  HStack,
  Text,
  Field,
  NativeSelect,
  Separator,
  Switch,
} from '@chakra-ui/react';
import type { PerformanceSettings } from '@/lib/settings-types';
import type { PerformanceTier } from '@/lib/performance-detector';

interface PerformanceTabProps {
  settings: PerformanceSettings;
  updateSetting: <K extends keyof PerformanceSettings>(
    key: K,
    value: PerformanceSettings[K]
  ) => void;
  handleTierChange: (tier: PerformanceTier) => void;
}

export const PerformanceTab = memo(function PerformanceTab({
  settings,
  updateSetting,
  handleTierChange,
}: PerformanceTabProps) {
  return (
    <VStack gap={4} align="stretch">
      <Field.Root>
        <Field.Label color="gray.300">Performance Tier</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Select a preset configuration based on your device capabilities
        </Field.HelperText>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={settings.tier || 'medium'}
            onChange={(e) =>
              handleTierChange(e.currentTarget.value as PerformanceTier)
            }
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          >
            <option value="low">Low (Minimal animations)</option>
            <option value="medium">Medium (Balanced)</option>
            <option value="high">High (Full features)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <VStack gap={3} align="stretch">
        <Text color="gray.300" fontSize="sm" fontWeight={600}>
          Animations
        </Text>

        <HStack justify="space-between">
          <VStack align="start" gap={0}>
            <Text color="gray.200" fontSize="sm">
              Enable Animations
            </Text>
            <Text color="gray.500" fontSize="xs">
              Enable all UI animations and transitions
            </Text>
          </VStack>
          <Switch.Root
            checked={settings.animationsEnabled ?? true}
            onCheckedChange={(e) =>
              updateSetting('animationsEnabled', e.checked)
            }
            colorPalette="emerald"
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>

        <HStack justify="space-between">
          <VStack align="start" gap={0}>
            <Text color="gray.200" fontSize="sm">
              Background Animations
            </Text>
            <Text color="gray.500" fontSize="xs">
              Enable 3D background animations
            </Text>
          </VStack>
          <Switch.Root
            checked={settings.backgroundAnimationsEnabled ?? true}
            onCheckedChange={(e) =>
              updateSetting('backgroundAnimationsEnabled', e.checked)
            }
            colorPalette="emerald"
            disabled={!settings.animationsEnabled}
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>

        <HStack justify="space-between">
          <VStack align="start" gap={0}>
            <Text color="gray.200" fontSize="sm">
              Chakra UI Animations
            </Text>
            <Text color="gray.500" fontSize="xs">
              Enable component animations and transitions
            </Text>
          </VStack>
          <Switch.Root
            checked={settings.chakraAnimationsEnabled ?? true}
            onCheckedChange={(e) =>
              updateSetting('chakraAnimationsEnabled', e.checked)
            }
            colorPalette="emerald"
            disabled={!settings.animationsEnabled}
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>

        <HStack justify="space-between">
          <VStack align="start" gap={0}>
            <Text color="gray.200" fontSize="sm">
              Reduced Motion
            </Text>
            <Text color="gray.500" fontSize="xs">
              Respect system reduced motion preference
            </Text>
          </VStack>
          <Switch.Root
            checked={settings.reducedMotion ?? false}
            onCheckedChange={(e) => updateSetting('reducedMotion', e.checked)}
            colorPalette="emerald"
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>
      </VStack>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <VStack gap={3} align="stretch">
        <Text color="gray.300" fontSize="sm" fontWeight={600}>
          Background Complexity
        </Text>

        <Field.Root>
          <Field.Label color="gray.300">Max Complexity</Field.Label>
          <Field.HelperText color="gray.500" fontSize="xs">
            Controls the complexity of background animations
          </Field.HelperText>
          <NativeSelect.Root disabled={!settings.backgroundAnimationsEnabled}>
            <NativeSelect.Field
              value={settings.maxBackgroundComplexity}
              onChange={(e) =>
                updateSetting(
                  'maxBackgroundComplexity',
                  e.currentTarget
                    .value as PerformanceSettings['maxBackgroundComplexity']
                )
              }
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _focus={{ borderColor: 'emerald.400' }}
            >
              <option value="minimal">Minimal (No backgrounds)</option>
              <option value="simple">Simple (Basic effects)</option>
              <option value="normal">Normal (Standard effects)</option>
              <option value="full">Full (All features)</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </VStack>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <VStack gap={3} align="stretch">
        <Text color="gray.300" fontSize="sm" fontWeight={600}>
          Power Management
        </Text>

        <HStack justify="space-between">
          <VStack align="start" gap={0}>
            <Text color="gray.200" fontSize="sm">
              Low Power Mode
            </Text>
            <Text color="gray.500" fontSize="xs">
              Reduce CPU/GPU usage for better battery life
            </Text>
          </VStack>
          <Switch.Root
            checked={settings.lowPowerMode ?? false}
            onCheckedChange={(e) => updateSetting('lowPowerMode', e.checked)}
            colorPalette="emerald"
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>
      </VStack>
    </VStack>
  );
});
