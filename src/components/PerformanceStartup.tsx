// Startup component that detects performance and configures app accordingly.
//
// Bootstrap order:
//   1. Disclaimer (standalone alert modal)
//   2. Prelaunch loader checklist (detection + model bootstrap)
//   3. Capabilities announcement dialog (recommended settings, editable)
//   4. App (retro chat view)
import type { DetectionStageDisplay } from '@/components/CapabilitiesDialog';
import { CapabilitiesDialog } from '@/components/CapabilitiesDialog';
import { DisclaimerDialog } from '@/components/DisclaimerDialog';
import { SystemOfflineView } from '@/components/SystemOfflineView';
import { ModelDownloadProgressView } from '@/components/performance/ModelDownloadProgress';
import { PerformanceDetectionView } from '@/components/performance/PerformanceDetectionView';
import { usePerformanceStartup } from '@/hooks/usePerformanceStartup';
import { useSettingsStore } from '@/lib/settings-store';
import { Box, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

interface PerformanceStartupProps {
  onComplete: () => void;
  children: React.ReactNode;
}

export function PerformanceStartup({
  onComplete,
  children,
}: PerformanceStartupProps) {
  const state = usePerformanceStartup(onComplete);
  const getPerformanceSettings = useSettingsStore(
    (s) => s.getPerformanceSettings
  );
  // Auto-hide the background download toast a few seconds after settling so
  // it never becomes a permanent overlay.
  const [showBackgroundProgress, setShowBackgroundProgress] = useState(true);
  const kokoroProgress = state.kokoroProgress;
  // Whisper (transcription) only ever loads as a blocking bootstrap step on
  // the detection screen — it is awaited before startup completes — so it
  // must never surface (or appear to load) after bootstrap. The background
  // toast below therefore tracks the Kokoro TTS download only.
  const modelsSettled =
    (kokoroProgress?.status === 'complete' ||
      kokoroProgress?.status === 'error' ||
      !kokoroProgress) &&
    Boolean(kokoroProgress);
  useEffect(() => {
    if (!modelsSettled) return;
    const timer = setTimeout(() => setShowBackgroundProgress(false), 3_000);
    return () => clearTimeout(timer);
  }, [modelsSettled]);

  if (state.showRejected) {
    return <SystemOfflineView />;
  }

  // Step 1: standalone disclaimer alert modal (separate from bootstrap view).
  if (state.showDisclaimer) {
    return (
      <DisclaimerDialog
        onAccept={() => state.handleDisclaimerAccept()}
        onReject={() => state.setShowRejected(true)}
      />
    );
  }

  // Step 2: prelaunch loader checklist (pure progress view, no dialogs).
  if (state.isDetecting) {
    return (
      <PerformanceDetectionView
        metrics={state.metrics}
        stages={state.stages}
        currentStage={state.currentStage}
        progress={state.progress}
        providerStatus={state.providerStatus}
        kokoroProgress={state.kokoroProgress}
        whisperProgress={state.whisperProgress}
        isModelPreloading={state.isModelPreloading}
      />
    );
  }

  // Step 3: capabilities announcement dialog (recommended settings, editable).
  if (state.showCapabilities && state.metrics) {
    const recommendedTier =
      getPerformanceSettings()?.tier ?? state.metrics.tier;
    return (
      <CapabilitiesDialog
        metrics={state.metrics}
        stages={state.stages as DetectionStageDisplay[]}
        recommendedTier={recommendedTier}
        recommendedTranscription={state.recommendedTranscription}
        providerLabel={state.providerLabel}
        onConfirm={(selectedTier, transcriptionMode) =>
          state.handleCapabilitiesConfirm(selectedTier, transcriptionMode)
        }
      />
    );
  }

  const tierColor =
    state.metrics?.tier === 'high'
      ? 'emerald'
      : state.metrics?.tier === 'medium'
        ? 'cyan'
        : 'gray';
  return (
    <>
      {children}
      {/* Non-blocking background model download progress (Kokoro only).
          Whisper loads as a blocking bootstrapping step on the detection
          screen instead, so it never appears here. */}
      {showBackgroundProgress && state.kokoroProgress && (
        <Box
          position="fixed"
          bottom={4}
          right={4}
          zIndex={2000}
          minW="280px"
          maxW="400px"
          bg="rgba(0, 0, 0, 0.75)"
          border="1px solid"
          borderColor="rgba(255, 255, 255, 0.15)"
          borderRadius="md"
          p={3}
          backdropFilter="blur(4px)"
        >
          <Text fontSize="xs" color="gray.400" letterSpacing="0.05em" mb={1}>
            DOWNLOADING MODELS IN BACKGROUND
          </Text>
          <ModelDownloadProgressView
            kokoroProgress={state.kokoroProgress}
            whisperProgress={null}
            tierColor={tierColor}
          />
        </Box>
      )}
    </>
  );
}
