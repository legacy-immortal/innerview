/**
 * @file System visualization controls (data source, cycle timing, scale, color, and offset).
 * @module background/SystemVisualizationSection
 */
import type { JSX } from 'react';
import { memo } from 'react';
import { SYSTEM_SOURCE_OPTIONS } from '@/hooks/useSystemDataSource';
import type {
  BackgroundSettings,
  SystemVisualizationSettings,
  SystemVisualizationSourceId,
} from '@/lib/settings-types';
import {
  Box,
  Button,
  Collapsible,
  Field,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  NumberInput,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { HiRefresh } from 'react-icons/hi';
import { FONT_FAMILY } from './controlFields';

const DEFAULT_CYCLE_DURATION_MS = 20000;
const CYCLE_DURATION_MS_MIN = 2000;
const CYCLE_DURATION_MS_MAX = 120000;

const DEFAULT_SYSTEM_VISUALIZATION = {
  scale: 1,
  color: '#00D9FF',
  offsetX: 0,
  offsetY: 0,
} as const;

interface SystemVisualizationSectionProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly settings: BackgroundSettings;
  readonly onSourceChange: (sourceId: SystemVisualizationSourceId | '') => void;
  readonly onCycleChange: (cycle: boolean) => void;
  readonly onCycleDurationChange: (durationMs: number) => void;
  readonly onSystemVisualizationChange: (
    patch: Partial<SystemVisualizationSettings>
  ) => void;
  readonly onSystemVisualizationTypesChange: (
    typeKey: keyof NonNullable<SystemVisualizationSettings['types']>,
    patch: Record<string, unknown>
  ) => void;
}

function SystemVisualizationSectionComponent({
  open,
  onOpenChange,
  settings,
  onSourceChange,
  onCycleChange,
  onCycleDurationChange,
  onSystemVisualizationChange,
  onSystemVisualizationTypesChange,
}: SystemVisualizationSectionProps): JSX.Element {
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
          <Text fontSize="xs">System visualization</Text>
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
                Source
              </Field.Label>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field
                  value={settings.systemVisualizationSourceId ?? ''}
                  onChange={(e) =>
                    onSourceChange(
                      e.currentTarget.value as SystemVisualizationSourceId | ''
                    )
                  }
                >
                  <option value="">Cycle (default)</option>
                  {SYSTEM_SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
            <HStack justify="space-between" align="center">
              <Text fontSize="xs" color="gray.300" fontFamily={FONT_FAMILY}>
                Cycle animations
              </Text>
              <Switch.Root
                checked={settings.cycleSystemVisualizations !== false}
                onCheckedChange={(e) => onCycleChange(e.checked)}
                size="sm"
                colorPalette="cyan"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>
            <Field.Root>
              <Field.Label fontSize="xs" color="gray.300" mb={2}>
                Duration per animation (s)
              </Field.Label>
              <NumberInput.Root
                size="sm"
                min={CYCLE_DURATION_MS_MIN / 1000}
                max={CYCLE_DURATION_MS_MAX / 1000}
                step={1}
                value={String(
                  (settings.systemVisualizationCycleDurationMs ??
                    DEFAULT_CYCLE_DURATION_MS) / 1000
                )}
                onValueChange={(e) => {
                  const sec = parseFloat(String(e.value ?? '20'));
                  if (!Number.isNaN(sec)) {
                    onCycleDurationChange(sec * 1000);
                  }
                }}
              >
                <NumberInput.Control />
                <NumberInput.Input />
              </NumberInput.Root>
            </Field.Root>
            <HStack align="center" justify="space-between" mt={1} gap={2}>
              <Text fontSize="2xs" color="gray.400" fontFamily={FONT_FAMILY}>
                Cycle animation properties
              </Text>
              <IconButton
                aria-label="Restore cycle animation defaults"
                size="xs"
                variant="ghost"
                colorPalette="gray"
                _hover={{ bg: 'rgba(255, 255, 255, 0.08)' }}
                onClick={() => {
                  onSystemVisualizationChange({
                    ...DEFAULT_SYSTEM_VISUALIZATION,
                  });
                  onSystemVisualizationTypesChange('clock', {
                    showSeconds: true,
                  });
                }}
              >
                <HiRefresh />
              </IconButton>
            </HStack>
            <Field.Root>
              <Field.Label fontSize="2xs" color="gray.500" mb={1}>
                Scale
              </Field.Label>
              <NumberInput.Root
                size="sm"
                min={0.5}
                max={2}
                step={0.1}
                value={String(settings.systemVisualization?.scale ?? 1)}
                onValueChange={(e) => {
                  const v = parseFloat(String(e.value ?? '1'));
                  if (!Number.isNaN(v)) {
                    onSystemVisualizationChange({
                      scale: Math.max(0.5, Math.min(2, v)),
                    });
                  }
                }}
              >
                <NumberInput.Control />
                <NumberInput.Input />
              </NumberInput.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="2xs" color="gray.500" mb={1}>
                Color
              </Field.Label>
              <HStack gap={2} align="center">
                <Input
                  type="color"
                  size="sm"
                  w={8}
                  h={8}
                  p={0.5}
                  cursor="pointer"
                  value={settings.systemVisualization?.color ?? '#00D9FF'}
                  onChange={(e) =>
                    onSystemVisualizationChange({
                      color: e.target.value,
                    })
                  }
                />
                <Input
                  size="sm"
                  fontFamily="mono"
                  value={(
                    settings.systemVisualization?.color ?? '#00D9FF'
                  ).toUpperCase()}
                  onChange={(e) => {
                    const hex = e.target.value.startsWith('#')
                      ? e.target.value
                      : `#${e.target.value}`;
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                      onSystemVisualizationChange({ color: hex });
                    }
                  }}
                />
              </HStack>
            </Field.Root>
            <HStack
              gap={2}
              align="stretch"
              w="full"
              minW={0}
              maxW="100%"
              flexWrap={{ base: 'wrap', sm: 'nowrap' }}
              touchAction="none"
            >
              <Field.Root flex={1} minW={0} maxW="100%">
                <Field.Label fontSize="2xs" color="gray.500" mb={1}>
                  Offset X (px)
                </Field.Label>
                <NumberInput.Root
                  size="sm"
                  min={-400}
                  max={400}
                  step={10}
                  value={String(settings.systemVisualization?.offsetX ?? 0)}
                  onValueChange={(e) => {
                    const v = parseInt(String(e.value ?? '0'), 10);
                    if (!Number.isNaN(v)) {
                      onSystemVisualizationChange({
                        offsetX: Math.max(-400, Math.min(400, v)),
                      });
                    }
                  }}
                >
                  <NumberInput.Control />
                  <NumberInput.Input />
                </NumberInput.Root>
              </Field.Root>
              <Field.Root flex={1} minW={0} maxW="100%">
                <Field.Label fontSize="2xs" color="gray.500" mb={1}>
                  Offset Y (px)
                </Field.Label>
                <NumberInput.Root
                  size="sm"
                  min={-400}
                  max={400}
                  step={10}
                  value={String(settings.systemVisualization?.offsetY ?? 0)}
                  onValueChange={(e) => {
                    const v = parseInt(String(e.value ?? '0'), 10);
                    if (!Number.isNaN(v)) {
                      onSystemVisualizationChange({
                        offsetY: Math.max(-400, Math.min(400, v)),
                      });
                    }
                  }}
                >
                  <NumberInput.Control />
                  <NumberInput.Input />
                </NumberInput.Root>
              </Field.Root>
            </HStack>
            <Text
              fontSize="2xs"
              color="gray.500"
              fontFamily={FONT_FAMILY}
              mt={1}
            >
              Clock
            </Text>
            <Field.Root>
              <HStack justify="space-between" align="center">
                <Field.Label fontSize="2xs" color="gray.500">
                  Show seconds hand
                </Field.Label>
                <Switch.Root
                  checked={
                    settings.systemVisualization?.types?.clock?.showSeconds !==
                    false
                  }
                  onCheckedChange={(e) =>
                    onSystemVisualizationTypesChange('clock', {
                      showSeconds: e.checked,
                    })
                  }
                  size="sm"
                  colorPalette="cyan"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </HStack>
            </Field.Root>
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/** System visualization controls (source, cycling, scale, color, and offset). */
export const SystemVisualizationSection = memo(
  SystemVisualizationSectionComponent
);
