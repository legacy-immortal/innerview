/**
 * @file Opt-in prompt shown before preloading Kokoro/Whisper on overburdened hardware.
 * @module components/performance/ModelPreloadOptInDialog.tsx
 */
// Opt-in dialog for model preload: rendered when the device is detected as
// hardware-overburdened (low RAM/GPU tier) so we never download and warm
// Kokoro/Whisper models without an explicit user choice.
import type { PerformanceMetrics } from '@/lib/performance-detector';
import { Box, Button, Checkbox, HStack, Text, VStack } from '@chakra-ui/react';

export interface ModelPreloadOptInDialogProps {
  metrics: PerformanceMetrics | null;
  optIn: boolean;
  isPreloading: boolean;
  onOptInChange: (checked: boolean) => void;
  onContinue: () => void;
  onSkip: () => void;
}

/**
 * Checkbox/dialog asking the user whether to preload local models.
 *
 * @param props - Metrics for context, checkbox state, and handlers.
 * @returns The opt-in panel.
 */
export function ModelPreloadOptInDialog({
  metrics,
  optIn,
  isPreloading,
  onOptInChange,
  onContinue,
  onSkip,
}: ModelPreloadOptInDialogProps) {
  return (
    <Box
      mt={4}
      p={4}
      bg="rgba(255, 255, 255, 0.03)"
      border="1px solid"
      borderColor="rgba(255, 255, 255, 0.15)"
      borderRadius="none"
      role="dialog"
      aria-label="Preload local models"
    >
      <VStack gap={3} align="stretch">
        <Text
          fontSize="xs"
          color="gray.200"
          fontWeight={600}
          letterSpacing="0.05em"
        >
          PRELOAD LOCAL MODELS?
        </Text>
        <Text fontSize="xs" color="gray.400" letterSpacing="0.02em">
          This device looks hardware-overburdened (low memory or low GPU tier),
          so downloading the Kokoro voice and Whisper transcription models now
          could slow or freeze other apps. Nothing is downloaded until you
          choose below; you can also load a model later when you first use voice
          or transcription.
          {metrics
            ? ` Detected: ${metrics.tier.toUpperCase()} tier, ${
                metrics.deviceMemory
                  ? `${metrics.deviceMemory} GB RAM`
                  : 'unknown RAM'
              }, GPU ${(metrics.gpuTier ?? 'unknown').toUpperCase()}.`
            : ''}
        </Text>
        <Checkbox.Root
          checked={optIn}
          onCheckedChange={(e) => onOptInChange(e.checked === true)}
          colorPalette="emerald"
          disabled={isPreloading}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label color="gray.300" fontSize="xs">
            Preload Kokoro + Whisper models now (may use memory and data)
          </Checkbox.Label>
        </Checkbox.Root>
        <HStack gap={3} justify="flex-end" pt={1}>
          <Button
            size="sm"
            variant="outline"
            colorPalette="gray"
            onClick={onSkip}
            disabled={isPreloading}
          >
            Skip
          </Button>
          <Button
            size="sm"
            colorPalette="emerald"
            onClick={onContinue}
            disabled={isPreloading}
            loading={isPreloading && optIn}
          >
            {optIn ? 'Preload models' : 'Continue without preloading'}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
