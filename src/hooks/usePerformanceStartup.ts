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
  canPreloadModels,
  detectPerformanceCached,
  generatePerformanceSettings,
  getPerformanceSettingsForTier,
  isHardwareOverburdened,
  type PerformanceMetrics,
} from '@/lib/performance-detector';
import {
  getModelPreloadOptIn,
  setModelPreloadOptInStored,
} from '@/lib/model-preload-opt-in-storage';
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

/** Bounded delay: resolves after `ms`, or after `maxMs` if timers are throttled. */
const delayMs = (ms: number, maxMs = ms + 2000): Promise<void> =>
  new Promise<void>((resolve) => {
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(tid);
      window.clearTimeout(cap);
      resolve();
    };
    const tid = window.setTimeout(done, ms);
    const cap = window.setTimeout(done, maxMs);
  });

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
  /** True while waiting for the model preload opt-in on overburdened hardware. */
  modelPreloadOptInRequired: boolean;
  /** Checkbox state for the model preload opt-in dialog. */
  modelPreloadOptIn: boolean;
  /** True while an opt-in-confirmed model preload is running. */
  isModelPreloading: boolean;
  setShowDisclaimer: (v: boolean) => void;
  setShowRejected: (v: boolean) => void;
  handleDisclaimerAccept: (
    selectedTier: Parameters<typeof getPerformanceSettingsForTier>[1],
    providerConfig: { baseURL: string; apiKey?: string }
  ) => void;
  setModelPreloadOptIn: (v: boolean) => void;
  confirmModelPreloadOptIn: () => Promise<void>;
  declineModelPreloadOptIn: () => Promise<void>;
}

/**
 * Defer work until main thread is idle / App has mounted, so model downloads
 * never block first paint. Falls back to a timer where requestIdleCallback
 * is unavailable. Never blocks startup.
 */
function scheduleIdleCallback(callback: () => void): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const requestIdleCallback = (
      window as unknown as {
        requestIdleCallback: (
          cb: () => void,
          opts?: { timeout?: number }
        ) => number;
      }
    ).requestIdleCallback;
    requestIdleCallback(callback, { timeout: 2_000 });
  } else {
    setTimeout(callback, 1_500);
  }
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
  const [modelPreloadOptInRequired, setModelPreloadOptInRequired] =
    useState(false);
  const [modelPreloadOptIn, setModelPreloadOptInState] = useState(false);
  const [isModelPreloading, setIsModelPreloading] = useState(false);
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
  // Latest metrics (kept in a ref so opt-in confirm/decline handlers can preload)
  const latestMetricsRef = useRef<PerformanceMetrics | null>(null);
  // True while startup is paused waiting for the opt-in decision
  const modelPreloadOptInPendingRef = useRef(false);
  // Latest onComplete callback (ref avoids stale closures in async flow)
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  // Guards so startup completes exactly once after an opt-in decision
  const startupFinishedRef = useRef(false);
  // Bootstrap latch: once startup has finished, no model preload may ever
  // start again. Guards against the detection effect re-running
  // post-bootstrap (e.g. parent re-renders) triggering new downloads.
  const bootstrapFinishedRef = useRef(false);
  // Mirrors isModelPreloading state for the global failsafe timer.
  const isModelPreloadingRef = useRef(false);

  /**
   * Move from detection to the disclaimer or app.
   * Runs once startup is no longer paused for an opt-in decision.
   */
  const finishStartup = () => {
    if (startupFinishedRef.current) return;
    startupFinishedRef.current = true;
    // Latch before the app mounts: any later preload attempt is a no-op.
    bootstrapFinishedRef.current = true;
    setIsDetecting(false);
    if (getDisclaimerAccepted()) {
      onCompleteRef.current();
    } else {
      (async () => {
        try {
          const controller = new AbortController();
          const tid = window.setTimeout(() => controller.abort(), 4000);
          const res = await fetch('/api/provider/scan', {
            signal: controller.signal,
          }).then((r) => r.json());
          window.clearTimeout(tid);
          setDetectedProviders(res.providers ?? []);
        } catch {
          setDetectedProviders([]);
        }
        setShowDisclaimer(true);
      })();
    }
  };

  // Dev/testing escape hatch: force past detection if a probe stalls.
  if (typeof window !== 'undefined') {
    (window as unknown as { __innerviewForceStartup?: () => void })
      .__innerviewForceStartup = finishStartup;
  }

  // In-flight Whisper preload promise (bootstrapping step, started once).
  const whisperPreloadPromiseRef = useRef<Promise<void> | null>(null);

  /**
   * Start the Whisper (transcription model) preload as a bootstrapping step:
   * it starts immediately (never deferred to idle) and callers await it
   * before finishing startup, so download/loading progress — including
   * per-file %, bytes, and speed — is visible on the detection screen
   * instead of in a dismissible background toast after it disappears.
   * @returns Resolves when the Whisper preload settles (failures are
   * reported via progress state, never thrown).
   */
  const startWhisperPreload = (): Promise<void> => {
    // Zero loads post-bootstrap: after startup finishes, never start a new
    // preload. Callers only invoke this during bootstrap (detection
    // screen, opt-in dialog) where progress is visible.
    if (bootstrapFinishedRef.current) {
      return Promise.resolve();
    }
    if (whisperPreloadPromiseRef.current) {
      return whisperPreloadPromiseRef.current;
    }
    transcriptionTestStartedRef.current = true;
    console.log('[PerformanceStartup] Starting Whisper preload (bootstrap)...');
    isModelPreloadingRef.current = true;
    setIsModelPreloading(true);
    const promise = preloadWhisperModel((progress) => {
      setWhisperProgress(progress);
    })
      .catch((error) => {
        console.error('Failed to preload Whisper model:', error);
        setWhisperProgress({
          model: 'whisper',
          progress: 0,
          status: 'error',
          phase: 'error',
          message: 'Whisper model download failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      })
      .finally(() => {
        isModelPreloadingRef.current = false;
        setIsModelPreloading(false);
      });
    whisperPreloadPromiseRef.current = promise;
    return promise;
  };

  /**
   * Preload Kokoro (background, non-blocking) with the existing success/error
   * progress wiring. Whisper is deliberately excluded: it runs as a blocking
   * bootstrapping step via startWhisperPreload so users see its detailed
   * progress during startup.
   * @param detectedMetrics - Metrics gating the model.
   */
  const startKokoroPreload = async (
    detectedMetrics: PerformanceMetrics
  ): Promise<void> => {
    // Preload Kokoro if WebGPU or WASM is supported
    if (
      !detectedMetrics.supportsWebGPU &&
      !detectedMetrics.supportsLocalTranscription
    ) {
      return;
    }
    await preloadKokoroModel((progress) => {
      setKokoroProgress(progress);
    }).catch((error) => {
      console.error('Failed to preload Kokoro model:', error);
      setKokoroProgress({
        model: 'kokoro',
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  };

  useEffect(() => {
    // If this effect re-runs after startup finished (e.g. a parent
    // re-render created a new onComplete identity), do nothing — detection
    // and model preloads are bootstrap-only.
    if (bootstrapFinishedRef.current) {
      return;
    }
    let aborted = false;
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
            if (aborted) return;
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
            if (aborted) return;
            setStages((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], status, value };
              return updated;
            });
            setCurrentStage(index);
          };

          // Progressive detection stages
          updateStage(0, 'detecting');
          await delayMs(200);

          const detectedMetrics = await detectPerformanceCached();
          if (aborted) return;
          setMetrics(detectedMetrics);

          // Update stages progressively with actual values
          updateStage(
            0,
            'complete',
            `${detectedMetrics.hardwareConcurrency} cores`
          );
          updateStage(1, 'detecting');
          await delayMs(150);

          updateStage(
            1,
            'complete',
            detectedMetrics.deviceMemory
              ? `${detectedMetrics.deviceMemory} GB`
              : 'Unknown'
          );
          updateStage(2, 'detecting');
          await delayMs(200);

          updateStage(
            2,
            'complete',
            detectedMetrics.gpuTier?.toUpperCase() || 'UNKNOWN'
          );
          updateStage(3, 'detecting');
          await delayMs(100);

          updateStage(
            3,
            'complete',
            detectedMetrics.supportsWebGL2 ? 'YES' : 'NO'
          );
          updateStage(4, 'detecting');
          await delayMs(100);

          updateStage(
            4,
            'complete',
            detectedMetrics.supportsWebGPU ? 'YES' : 'NO'
          );
          updateStage(5, 'detecting');
          await delayMs(300);

          updateStage(5, 'complete', `${detectedMetrics.frameRate} FPS`);
          updateStage(6, 'detecting');
          await delayMs(200);

          updateStage(
            6,
            'complete',
            detectedMetrics.supportsSpeechSynthesis
              ? `YES (${detectedMetrics.availableVoices} voices)`
              : 'NO'
          );
          updateStage(7, 'detecting');
          await delayMs(200);

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
          await delayMs(200);

          const providerResult = await Promise.race<ProviderStatus>([
            checkProvider(),
            new Promise<ProviderStatus>((resolve) =>
              window.setTimeout(
                () =>
                  resolve({
                    status: 'unavailable',
                    baseURL: '',
                    error: 'Provider check timed out',
                    lastChecked: new Date(),
                  }),
                5000
              )
            ),
          ]);
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
          await delayMs(150);

          updateStage(
            9,
            'complete',
            `${detectedMetrics.score}/100 (${detectedMetrics.tier.toUpperCase()})`
          );

          latestMetricsRef.current = detectedMetrics;

          // Check if we should preload models
          // Capable devices auto-preload (medium/high tier) unless the
          // hardware is overburdened (low RAM/GPU tier), in which case the
          // user must opt in first.
          const isCapable = canPreloadModels(detectedMetrics);
          const overburdened = isHardwareOverburdened(detectedMetrics);
          const storedOptIn = getModelPreloadOptIn();
          const autoPreload =
            isCapable &&
            !overburdened &&
            (detectedMetrics.tier === 'medium' ||
              detectedMetrics.tier === 'high');
          const needsOptIn = isCapable && overburdened && storedOptIn === null;

          console.log('[PerformanceStartup] First run detection:', {
            tier: detectedMetrics.tier,
            supportsLocalTranscription:
              detectedMetrics.supportsLocalTranscription,
            supportsWebGPU: detectedMetrics.supportsWebGPU,
            overburdened,
            autoPreload,
            needsOptIn,
          });

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
          await delayMs(500);

          if (autoPreload) {
            // Whisper is a bootstrapping step (backend, default path):
            // preload regardless of browser WASM (supportsLocalTranscription).
            await startWhisperPreload();
            scheduleIdleCallback(() => {
              void startKokoroPreload(detectedMetrics);
            });
          } else if (needsOptIn) {
            // Pause completion until the user decides; the opt-in handlers
            // in this hook preload (if opted in) and finish startup.
            modelPreloadOptInPendingRef.current = true;
            setModelPreloadOptInRequired(true);
          } else if (isCapable && overburdened && storedOptIn === true) {
            // Previously opted in on overburdened hardware: blocking bootstrap.
            await startWhisperPreload();
            scheduleIdleCallback(() => {
              void startKokoroPreload(detectedMetrics);
            });
          }
        } else {
          // Settings exist: use cached metrics but animate through init steps
          const cached = await detectPerformanceCached();
          setMetrics(cached);
          latestMetricsRef.current = cached;
          const completedStages = buildStagesFromMetrics(cached);
          await runCachedInitAnimation(
            completedStages,
            setProgress,
            setCurrentStage,
            setStages
          );

          // Overburdened devices: remember the prior choice or ask first.
          const cachedCapable = canPreloadModels(cached);
          const cachedOverburdened = isHardwareOverburdened(cached);
          const cachedStoredOptIn = getModelPreloadOptIn();
          const cachedNeedsOptIn =
            cachedCapable && cachedOverburdened && cachedStoredOptIn === null;
          // Remembered opt-in only applies on overburdened hardware; on
          // capable hardware the regular transcription-test branch below loads
          // Whisper (never after bootstrap, never without opt-in when
          // overburdened).
          const cachedOptedIn =
            cachedCapable && cachedOverburdened && cachedStoredOptIn === true;

          // Preload backend Whisper on cached runs so it's ready for first
          // transcription (avoids post-bootstrap on-demand load).
          const shouldTestTranscription =
            cached.tier === 'medium' || cached.tier === 'high';

          console.log('[PerformanceStartup] Cached run:', {
            tier: cached.tier,
            supportsLocalTranscription: cached.supportsLocalTranscription,
            shouldTestTranscription,
            overburdened: cachedOverburdened,
            needsOptIn: cachedNeedsOptIn,
          });

          if (cachedNeedsOptIn) {
            // Pause completion until the user decides.
            modelPreloadOptInPendingRef.current = true;
            setModelPreloadOptInRequired(true);
          } else if (cachedOptedIn) {
            // Previously opted in on overburdened hardware: blocking bootstrap.
            await startWhisperPreload();
            scheduleIdleCallback(() => {
              void startKokoroPreload(cached);
            });
          } else if (
            shouldTestTranscription &&
            !cachedOverburdened &&
            !transcriptionTestStartedRef.current
          ) {
            // Whisper loads as part of bootstrapping (was previously an
            // idle-deferred background test invisible behind the live app):
            // await it so detailed progress is shown on the detection screen.
            await startWhisperPreload();
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
        // If waiting for the opt-in decision, stay on the detection view
        // until the user confirms or declines.
        if (!aborted && !modelPreloadOptInPendingRef.current) {
          finishStartup();
        }
      }
    }

    void detectAndConfigure();
    // Global failsafe: detection/animation must never strand the user on the
    // bootstrap screen (e.g. rAF/timer stalls in headless or a hung probe).
    // Does not fire while opt-in is pending (user decision required) or while
    // an intentional Whisper preload is showing progress.
    const failsafeId = window.setTimeout(() => {
      if (
        !aborted &&
        !startupFinishedRef.current &&
        !modelPreloadOptInPendingRef.current &&
        !isModelPreloadingRef.current
      ) {
        console.warn(
          '[PerformanceStartup] Failsafe: forcing startup completion'
        );
        finishStartup();
      }
    }, 45000);
    // NOTE: `onComplete` deliberately excluded — finishStartup uses onCompleteRef.
    // Cleanup aborts StrictMode's first invocation so it doesn't interleave.
    return () => {
      aborted = true;
      window.clearTimeout(failsafeId);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [
    savePerformanceSettings,
    getPerformanceSettings,
    getGenerationSettings,
    updateGenerationSettings,
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

  const setModelPreloadOptIn: PerformanceStartupState['setModelPreloadOptIn'] =
    (v) => {
      setModelPreloadOptInState(v);
    };

  /**
   * Resolve the pending opt-in via the dialog's primary button.
   * Persists the checkbox choice, preloads both models when checked, then
   * finishes startup. An unchecked box means "continue without preloading".
   * @returns Resolves once any opt-in preload settles and startup finishes.
   */
  const confirmModelPreloadOptIn: PerformanceStartupState['confirmModelPreloadOptIn'] =
    async () => {
      const optedIn = modelPreloadOptIn;
      const detectedMetrics = latestMetricsRef.current;
      setModelPreloadOptInStored(optedIn);
      modelPreloadOptInPendingRef.current = false;
      setModelPreloadOptInRequired(false);
      if (optedIn && detectedMetrics && canPreloadModels(detectedMetrics)) {
        // Whisper is a bootstrapping step: await it (with detailed progress
        // on the detection screen) before finishing startup. Kokoro stays a
        // non-blocking idle background download.
        await startWhisperPreload();
        scheduleIdleCallback(() => {
          void startKokoroPreload(detectedMetrics);
        });
      }
      finishStartup();
    };

  /**
   * Resolve the pending opt-in via Skip: persist a decline and finish
   * startup without preloading.
   * @returns Resolves once startup finishes.
   */
  const declineModelPreloadOptIn: PerformanceStartupState['declineModelPreloadOptIn'] =
    async () => {
      setModelPreloadOptInStored(false);
      modelPreloadOptInPendingRef.current = false;
      setModelPreloadOptInRequired(false);
      finishStartup();
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
    modelPreloadOptInRequired,
    modelPreloadOptIn,
    isModelPreloading,
    setShowDisclaimer,
    setShowRejected,
    handleDisclaimerAccept,
    setModelPreloadOptIn,
    confirmModelPreloadOptIn,
    declineModelPreloadOptIn,
  };
}
