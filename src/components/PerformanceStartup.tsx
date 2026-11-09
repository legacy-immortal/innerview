// Startup component that detects performance and configures app accordingly
import type { DetectionStageDisplay } from '@/components/DisclaimerDialog';
import { DisclaimerDialog } from '@/components/DisclaimerDialog';
import { SystemOfflineView } from '@/components/SystemOfflineView';
import { PerformanceDetectionView } from '@/components/performance/PerformanceDetectionView';
import { usePerformanceStartup } from '@/hooks/usePerformanceStartup';
import { useSettingsStore } from '@/lib/settings-store';

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

  return <>{children}</>;
}
