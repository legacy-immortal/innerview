// Startup component that detects performance and configures app accordingly
import type { DetectionStageDisplay } from '@/components/DisclaimerDialog';
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
  const getGenerationSettings = useSettingsStore(
    (s) => s.getGenerationSettings
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
        modelPreloadOptInRequired={state.modelPreloadOptInRequired}
        modelPreloadOptIn={state.modelPreloadOptIn}
        isModelPreloading={state.isModelPreloading}
        onModelPreloadOptInChange={state.setModelPreloadOptIn}
        onConfirmModelPreload={() => {
          void state.confirmModelPreloadOptIn();
        }}
        onSkipModelPreload={() => {
          void state.declineModelPreloadOptIn();
        }}
      />
    );
  }

  if (state.showRejected) {
    return <SystemOfflineView />;
  }

  if (state.showDisclaimer && state.metrics) {
    const recommendedTier =
      getPerformanceSettings()?.tier ?? state.metrics.tier;
    const currentGeneration = getGenerationSettings();
    return (
      <DisclaimerDialog
        metrics={state.metrics}
        stages={state.stages as DetectionStageDisplay[]}
        recommendedTier={recommendedTier}
        detectedProviders={state.detectedProviders}
        initialBaseURL={currentGeneration?.baseURL}
        initialApiKey={currentGeneration?.apiKey}
        onAccept={(selectedTier, providerConfig) =>
          state.handleDisclaimerAccept(selectedTier, providerConfig)
        }
        onReject={() => state.setShowRejected(true)}
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
