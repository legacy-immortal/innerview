// Performance detection orchestration hook (extracted from PerformanceStartup.tsx).
import {
  getDisclaimerAccepted,
  setDisclaimerAccepted,
} from '@/lib/disclaimer-storage';
import {
  preloadKokoroModel,
  preloadWhisperModel,
  type ModelDownloadProgress,
} from '@/lib/model-preloader';
import {
  detectPerformanceCached,
  generatePerformanceSettings,
  getPerformanceSettingsForTier,
  type PerformanceMetrics,
} from '@/lib/performance-detector';
import {
  useProviderStatusStore,
  type ProviderStatus,
} from '@/lib/provider-status';
import { useSettingsStore } from '@/lib/settings-store';
import { useEffect, useRef, useState } from 'react';
import {
  buildStagesFromMetrics,
  runCachedInitAnimation,
  type DetectionStage,
} from '@/lib/performanceStartupUtils';

export interface PerformanceStartupState {
  isDetecting: boolean;
  showDisclaimer: boolean;
  showRejected: boolean;
  detectedProviders: Array<{ name: string; baseURL: string }>;
  metrics: PerformanceMetrics | null;
  progress: number;
  currentStage: number;
  stages: DetectionStage[];
  providerStatus: ProviderStatus | null;
  kokoroProgress: ModelDownloadProgress | null;
  whisperProgress: ModelDownloadProgress | null;
  setShowDisclaimer: (v: boolean) => void;
  setShowRejected: (v: boolean) => void;
  handleDisclaimerAccept: (
    selectedTier: Parameters<typeof getPerformanceSettingsForTier>[1],
    providerConfig: { baseURL: string; apiKey?: string }
  ) => void;
}

export function usePerformanceStartup(
  onComplete: () => void
): PerformanceStartupState {
  const [isDetecting, setIsDetecting] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [detectedProviders, setDetectedProviders] = useState<
    Array<{ name: string; baseURL: string }>
  >([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [stages, setStages] = useState<DetectionStage[]>([
    { name: 'CPU Cores', status: 'pending' },
    { name: 'System Memory', status: 'pending' },
    { name: 'GPU Tier', status: 'pending' },
    { name: 'WebGL Support', status: 'pending' },
    { name: 'WebGPU Support', status: 'pending' },
    { name: 'Frame Rate', status: 'pending' },
    { name: 'Speech Synthesis', status: 'pending' },
    { name: 'Transcription', status: 'pending' },
    { name: 'AI Provider', status: 'pending' },
    { name: 'Performance Score', status: 'pending' },
  ]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(
    null
  );
  const checkProvider = useProviderStatusStore((state) => state.checkProvider);
  const [kokoroProgress, setKokoroProgress] =
    useState<ModelDownloadProgress | null>(null);
  const [whisperProgress, setWhisperProgress] =
    useState<ModelDownloadProgress | null>(null);
  const savePerformanceSettings = useSettingsStore(
    (state) => state.savePerformanceSettings
  );
  const getPerformanceSettings = useSettingsStore(
    (state) => state.getPerformanceSettings
  );
  const getGenerationSettings = useSettingsStore(
    (state) => state.getGenerationSettings
  );
  const updateGenerationSettings = useSettingsStore(
    (state) => state.updateGenerationSettings
  );
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  // Prevent duplicate transcription test when effect runs twice (e.g. Strict Mode or HMR)
  const transcriptionTestStartedRef = useRef(false);

  useEffect(() => {
    async function detectAndConfigure() {
      try {
        // Check if we already have performance settings
        const existing = getPerformanceSettings();

        console.log('[PerformanceStartup] Existing settings:', existing);
        console.log(
          '[PerformanceStartup] autoDetected:',
          existing?.autoDetected
        );

        // Only detect if we don't have auto-detected settings
        if (!existing?.autoDetected) {
          console.log('[PerformanceStartup] Running fresh initialization...');
          // Start progress animation
          let currentProgress = 0;
          const progressSteps = [12, 20, 28, 36, 44, 52, 60, 68, 76, 90, 100];
          let stepIndex = 0;

          progressIntervalRef.current = setInterval(() => {
            if (stepIndex < progressSteps.length) {
              currentProgress = progressSteps[stepIndex];
              setProgress(currentProgress);
              stepIndex++;
            } else {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
            }
          }, 200);

          // Update stages as we detect
          const updateStage = (
            index: number,
            status: DetectionStage['status'],
            value?: string
          ) => {
            setStages((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], status, value };
              return updated;
            });
            setCurrentStage(index);
          };

          // Progressive detection stages
          updateStage(0, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 200));

          const detectedMetrics = await detectPerformanceCached();
          setMetrics(detectedMetrics);

          // Update stages progressively with actual values
          updateStage(
            0,
            'complete',
            `${detectedMetrics.hardwareConcurrency} cores`
          );
          updateStage(1, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 150));

          updateStage(
            1,
            'complete',
            detectedMetrics.deviceMemory
              ? `${detectedMetrics.deviceMemory} GB`
              : 'Unknown'
          );
          updateStage(2, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 200));

          updateStage(
            2,
            'complete',
            detectedMetrics.gpuTier?.toUpperCase() || 'UNKNOWN'
          );
          updateStage(3, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 100));

          updateStage(
            3,
            'complete',
            detectedMetrics.supportsWebGL2 ? 'YES' : 'NO'
          );
          updateStage(4, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 100));

          updateStage(
            4,
            'complete',
            detectedMetrics.supportsWebGPU ? 'YES' : 'NO'
          );
          updateStage(5, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 300));

          updateStage(5, 'complete', `${detectedMetrics.frameRate} FPS`);
          updateStage(6, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 200));

          updateStage(
            6,
            'complete',
            detectedMetrics.supportsSpeechSynthesis
              ? `YES (${detectedMetrics.availableVoices} voices)`
              : 'NO'
          );
          updateStage(7, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 200));

          const transcriptionStatus = [];
          if (detectedMetrics.supportsMediaRecorder) {
            transcriptionStatus.push('MediaRecorder');
          }
          if (detectedMetrics.supportsGetUserMedia) {
            transcriptionStatus.push('Microphone');
          }
          if (detectedMetrics.supportsLocalTranscription) {
            transcriptionStatus.push('Local');
          }
          updateStage(
            7,
            'complete',
            transcriptionStatus.length > 0
              ? transcriptionStatus.join(', ')
              : 'NO'
          );

          // Check AI provider availability
          updateStage(8, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 200));

          const providerResult = await checkProvider();
          setProviderStatus(providerResult);

          if (providerResult.status === 'available') {
            updateStage(
              8,
              'complete',
              providerResult.modelsAvailable
                ? `${providerResult.modelsAvailable} models`
                : 'CONNECTED'
            );
          } else {
            // Mark as error but don't block startup
            setStages((prev) => {
              const updated = [...prev];
              updated[8] = {
                ...updated[8],
                status: 'error',
                value: 'UNAVAILABLE',
                isError: true,
              };
              return updated;
            });
          }

          updateStage(9, 'detecting');
          await new Promise((resolve) => setTimeout(resolve, 150));

          updateStage(
            9,
            'complete',
            `${detectedMetrics.score}/100 (${detectedMetrics.tier.toUpperCase()})`
          );

          // Check if we should preload models
          // Only preload if performance tier is medium or high, and WASM/WebGPU is supported
          const shouldPreloadModels =
            (detectedMetrics.tier === 'medium' ||
              detectedMetrics.tier === 'high') &&
            (detectedMetrics.supportsLocalTranscription ||
              detectedMetrics.supportsWebGPU);

          console.log('[PerformanceStartup] First run detection:', {
            tier: detectedMetrics.tier,
            supportsLocalTranscription:
              detectedMetrics.supportsLocalTranscription,
            supportsWebGPU: detectedMetrics.supportsWebGPU,
            shouldPreloadModels,
          });

          if (shouldPreloadModels) {
            // Preload models in parallel
            const preloadPromises: Promise<void>[] = [];

            // Preload Kokoro if WebGPU or WASM is supported
            if (
              detectedMetrics.supportsWebGPU ||
              detectedMetrics.supportsLocalTranscription
            ) {
              preloadPromises.push(
                preloadKokoroModel((progress) => {
                  setKokoroProgress(progress);
                }).catch((error) => {
                  console.error('Failed to preload Kokoro model:', error);
                  setKokoroProgress({
                    model: 'kokoro',
                    progress: 0,
                    status: 'error',
                    error:
                      error instanceof Error ? error.message : 'Unknown error',
                  });
                })
              );
            }

            // Preload Whisper if local transcription is supported (once per init)
            if (
              detectedMetrics.supportsLocalTranscription &&
              !transcriptionTestStartedRef.current
            ) {
              transcriptionTestStartedRef.current = true;
              preloadPromises.push(
                preloadWhisperModel((progress) => {
                  setWhisperProgress(progress);
                }).catch((error) => {
                  console.error('Failed to preload Whisper model:', error);
                  setWhisperProgress({
                    model: 'whisper',
                    progress: 0,
                    status: 'error',
                    error:
                      error instanceof Error ? error.message : 'Unknown error',
                  });
                })
              );
            }

            // Wait for model downloads to complete (or fail gracefully)
            await Promise.allSettled(preloadPromises);
          }

          // Generate settings based on detected performance
          const settings = generatePerformanceSettings(detectedMetrics);

          // Save to store
          savePerformanceSettings({
            ...settings,
            autoDetected: true,
            tier: detectedMetrics.tier,
          });

          // Complete progress
          setProgress(100);
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          // Settings exist: use cached metrics but animate through init steps
          const cached = await detectPerformanceCached();
          setMetrics(cached);
          const completedStages = buildStagesFromMetrics(cached);
          await runCachedInitAnimation(
            completedStages,
            setProgress,
            setCurrentStage,
            setStages
          );

          // Still run transcription test on cached runs to validate the service
          const shouldTestTranscription =
            (cached.tier === 'medium' || cached.tier === 'high') &&
            cached.supportsLocalTranscription;

          console.log('[PerformanceStartup] Cached run:', {
            tier: cached.tier,
            supportsLocalTranscription: cached.supportsLocalTranscription,
            shouldTestTranscription,
          });

          if (shouldTestTranscription && !transcriptionTestStartedRef.current) {
            transcriptionTestStartedRef.current = true;
            console.log('[PerformanceStartup] Starting transcription test...');
            // Run transcription test in background (non-blocking)
            preloadWhisperModel((progress) => {
              console.log('[PerformanceStartup] Whisper progress:', progress);
              setWhisperProgress(progress);
            }).catch((error) => {
              console.error('Transcription test failed:', error);
              setWhisperProgress({
                model: 'whisper',
                progress: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            });
          }
        }
      } catch {
        // Fallback to low-performance settings on error; still animate init
        savePerformanceSettings({
          animationsEnabled: false,
          backgroundAnimationsEnabled: false,
          reducedMotion: true,
          lowPowerMode: true,
          maxParticles: 0,
          maxBackgroundComplexity: 'minimal',
          chakraAnimationsEnabled: false,
          virtualScrollingEnabled: true,
          autoDetected: true,
          tier: 'low',
        });
        const fallbackMetrics: PerformanceMetrics = {
          tier: 'low',
          score: 0,
          hardwareConcurrency: navigator.hardwareConcurrency ?? 2,
          frameRate: 20,
          supportsWebGL2: false,
          supportsWebGPU: false,
          supportsSpeechSynthesis: false,
          availableVoices: 0,
          supportsMediaRecorder: false,
          supportsGetUserMedia: false,
          supportsLocalTranscription: false,
        };
        setMetrics(fallbackMetrics);
        const completedStages = buildStagesFromMetrics(fallbackMetrics);
        await runCachedInitAnimation(
          completedStages,
          setProgress,
          setCurrentStage,
          setStages
        );
      } finally {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setIsDetecting(false);
        if (getDisclaimerAccepted()) {
          onComplete();
        } else {
          (async () => {
            try {
              const res = await fetch('/api/provider/scan').then((r) =>
                r.json()
              );
              setDetectedProviders(res.providers ?? []);
            } catch {
              setDetectedProviders([]);
            }
            setShowDisclaimer(true);
          })();
        }
      }
    }

    detectAndConfigure();
  }, [
    savePerformanceSettings,
    getPerformanceSettings,
    getGenerationSettings,
    updateGenerationSettings,
    onComplete,
    checkProvider,
  ]);

  const handleDisclaimerAccept: PerformanceStartupState['handleDisclaimerAccept'] =
    (selectedTier, providerConfig) => {
      savePerformanceSettings(
        getPerformanceSettingsForTier(metrics!, selectedTier)
      );
      updateGenerationSettings({
        baseURL: providerConfig.baseURL,
        apiKey: providerConfig.apiKey ?? '',
      });
      setDisclaimerAccepted();
      setShowDisclaimer(false);
      onComplete();
    };

  return {
    isDetecting,
    showDisclaimer,
    showRejected,
    detectedProviders,
    metrics,
    progress,
    currentStage,
    stages,
    providerStatus,
    kokoroProgress,
    whisperProgress,
    setShowDisclaimer,
    setShowRejected,
    handleDisclaimerAccept,
  };
}
