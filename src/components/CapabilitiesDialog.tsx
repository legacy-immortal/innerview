import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  Field,
  HStack,
  NativeSelect,
  Portal,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react';
import type {
  PerformanceMetrics,
  PerformanceTier,
} from '@/lib/performance-detector';

export interface DetectionStageDisplay {
  name: string;
  status: string;
  value?: string;
  isError?: boolean;
}

/** Transcription compute path confirmed in the capabilities dialog. */
export type TranscriptionMode = 'server' | 'browser';

const TIER_LABELS: Record<PerformanceTier, string> = {
  low: 'Low (Minimal animations)',
  medium: 'Medium (Balanced)',
  high: 'High (Full features)',
};

const TRANSCRIPTION_LABELS: Record<TranscriptionMode, string> = {
  server: 'Server (NVIDIA NIM — recommended)',
  browser: 'On-device (browser model)',
};

interface CapabilitiesDialogProps {
  metrics: PerformanceMetrics;
  stages: DetectionStageDisplay[];
  recommendedTier: PerformanceTier;
  recommendedTranscription: TranscriptionMode;
  providerLabel: string;
  onConfirm: (
    selectedTier: PerformanceTier,
    transcriptionMode: TranscriptionMode
  ) => void;
}

/**
 * Capabilities announcement dialog.
 *
 * Step 3 of bootstrap (after the disclaimer and the prelaunch loader
 * checklist): announces the recommended settings detected for this device
 * and lets the user modify them before entering the app. Compute-heavy
 * work (chat agent + transcription) is server-provided via NVIDIA NIM, so
 * no API endpoint/key entry (BYOK) is required here.
 */
export function CapabilitiesDialog({
  metrics,
  stages,
  recommendedTier,
  recommendedTranscription,
  providerLabel,
  onConfirm,
}: CapabilitiesDialogProps) {
  const [selectedTier, setSelectedTier] =
    useState<PerformanceTier>(recommendedTier);
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>(
    recommendedTranscription
  );

  const tierColor =
    metrics.tier === 'high'
      ? 'emerald'
      : metrics.tier === 'medium'
        ? 'cyan'
        : 'gray';

  return (
    <Dialog.Root
      open
      onOpenChange={(details) => {
        if (!details.open) return;
      }}
      closeOnEscape={false}
      closeOnInteractOutside={false}
      role="dialog"
      aria-modal="true"
      aria-label="Recommended capabilities"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="560px"
            bg="rgba(0, 0, 0, 0.95)"
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          >
            <Dialog.Header>
              <Dialog.Title color="white" fontSize="md" letterSpacing="0.05em">
                Recommended capabilities
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Text color="gray.400" fontSize="xs" fontWeight={600}>
                  Detection breakdown
                </Text>
                <VStack gap={1} align="stretch">
                  {stages.map((stage, index) => {
                    const isComplete = stage.status === 'complete';
                    const isError = stage.status === 'error' || stage.isError;
                    return (
                      <HStack
                        key={index}
                        gap={3}
                        fontSize="xs"
                        color={
                          isError
                            ? 'red.400'
                            : isComplete
                              ? `${tierColor}.400`
                              : 'gray.600'
                        }
                        letterSpacing="0.05em"
                      >
                        <Text w="12px" textAlign="right">
                          {isError ? '✗' : isComplete ? '✓' : '○'}
                        </Text>
                        <Text flex={1}>{stage.name}</Text>
                        {stage.value && (
                          <Text
                            color={isError ? 'red.300' : `${tierColor}.300`}
                            fontWeight={600}
                            letterSpacing="0.1em"
                          >
                            {stage.value}
                          </Text>
                        )}
                      </HStack>
                    );
                  })}
                </VStack>

                <Separator borderColor="rgba(255, 255, 255, 0.1)" />

                <Field.Root>
                  <Field.Label color="gray.300" fontSize="xs">
                    Performance preset
                  </Field.Label>
                  <Field.HelperText color="gray.500" fontSize="xs">
                    Recommended: {TIER_LABELS[recommendedTier]}
                  </Field.HelperText>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={selectedTier}
                      onChange={(e) =>
                        setSelectedTier(
                          e.currentTarget.value as PerformanceTier
                        )
                      }
                      bg="rgba(255, 255, 255, 0.05)"
                      borderColor="rgba(255, 255, 255, 0.1)"
                      color="white"
                      _focus={{ borderColor: 'emerald.400' }}
                    >
                      <option value="low">{TIER_LABELS.low}</option>
                      <option value="medium">{TIER_LABELS.medium}</option>
                      <option value="high">{TIER_LABELS.high}</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                <Separator borderColor="rgba(255, 255, 255, 0.1)" />

                <Field.Root>
                  <Field.Label color="gray.300" fontSize="xs">
                    Transcription
                  </Field.Label>
                  <Field.HelperText color="gray.500" fontSize="xs">
                    Recommended:{' '}
                    {TRANSCRIPTION_LABELS[recommendedTranscription]}. Server
                    transcription runs on our NVIDIA compute; on-device
                    downloads a browser model instead.
                  </Field.HelperText>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={transcriptionMode}
                      onChange={(e) =>
                        setTranscriptionMode(
                          e.currentTarget.value as TranscriptionMode
                        )
                      }
                      bg="rgba(255, 255, 255, 0.05)"
                      borderColor="rgba(255, 255, 255, 0.1)"
                      color="white"
                      _focus={{ borderColor: 'emerald.400' }}
                    >
                      <option value="server">
                        {TRANSCRIPTION_LABELS.server}
                      </option>
                      <option value="browser">
                        {TRANSCRIPTION_LABELS.browser}
                      </option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                <Separator borderColor="rgba(255, 255, 255, 0.1)" />

                <Box>
                  <Text color="gray.300" fontSize="sm" fontWeight={600} mb={2}>
                    Compute provider
                  </Text>
                  <Text color="gray.400" fontSize="xs" lineHeight="tall">
                    {providerLabel}
                  </Text>
                </Box>

                <HStack gap={3} justify="flex-end" w="full" pt={2}>
                  <Button
                    size="sm"
                    colorPalette="emerald"
                    onClick={() => onConfirm(selectedTier, transcriptionMode)}
                  >
                    Continue
                  </Button>
                </HStack>
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
