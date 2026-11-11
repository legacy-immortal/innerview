/**
 * @file usePerformanceStartup.ts — Performance detection orchestration hook.
 * @module hooks/usePerformanceStartup
 *
 * Performance detection orchestration hook (extracted from PerformanceStartup.tsx).
 * Bootstrap order: standalone disclaimer alert -> prelaunch loader checklist
 * (detection + model bootstrap) -> capabilities announcement dialog -> app.
 * Runs device performance detection on startup, stages progress through CPU,
 * memory, GPU, WebGL, WebGPU, frame rate, speech synthesis, transcription,
 * and AI provider checks. Compute-heavy work runs on server-side NVIDIA NIM,
 * so overburdened hardware skips local model downloads instead of blocking
 * on an opt-in. Owns the startup completion latch and a 45s failsafe that
 * never strands the user.
 */
import {
  getDisclaimerAccepted,
  setDisclaimerAccepted,
} from '@/lib/disclaimer-storage';
import {
  getCapabilitiesConfirmed,
  setCapabilitiesConfirmed,
} from '@/lib/capabilities-storage';
import {
  preloadKokoroModel,
  preloadWhisperModel,
  type ModelDownloadProgress,
} from '@/lib/model-preloader';
import {
  detectPerformanceCached,
  generatePerformanceSettings,
  getPerformanceSettingsForTier,
  isHardwareOverburdened,
  type PerformanceMetrics,
} from '@/lib/performance-detector';
import type { TranscriptionMode } from '@/components/CapabilitiesDialog';
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

/**
 * Whether Whisper should be preloaded during bootstrap given the detected
 * metrics. Skips preload when the microphone is unavailable (permission
 * denied or no device): there's no point downloading a transcription model
 * the user can't use to record audio.
 * @param metrics - Detected performance metrics.
 * @returns True when Whisper preload should proceed.
 */
function shouldPreloadWhisper(metrics: PerformanceMetrics): boolean {
  return Boolean(metrics.supportsMicrophone);
}

export interface PerformanceStartupState {
  isDetecting: boolean;
  showDisclaimer: boolean;
  showRejected: boolean;
  /** True while the capabilities dialog is announced and editable. */
  showCapabilities: boolean;
  /** Recommended transcription compute path for the capabilities dialog. */
  recommendedTranscription: TranscriptionMode;
  /** Human-readable compute provider announcement for the dialog. */
  providerLabel: string;
  metrics: PerformanceMetrics | null;
  progress: number;
  currentStage: number;
  stages: DetectionStage[];
  providerStatus: ProviderStatus | null;
  kokoroProgress: ModelDownloadProgress | null;
  whisperProgress: ModelDownloadProgress | null;
  /** True while an opt-in-confirmed model preload is running. */
  isModelPreloading: boolean;
  setShowDisclaimer: (v: boolean) => void;
  setShowRejected: (v: boolean) => void;
  /** Accept the standalone disclaimer; starts the prelaunch detection. */
  handleDisclaimerAccept: () => void;
  /**
   * Confirm the announced capabilities; persists the chosen tier and
   * transcription mode, then finishes startup.
   */
  handleCapabilitiesConfirm: (
    selectedTier: Parameters<typeof getPerformanceSettingsForTier>[1],
    transcriptionMode: TranscriptionMode
  ) => void;
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

/**
 * Performance detection orchestration hook.
 * Bootstrap order: standalone disclaimer alert -> prelaunch loader checklist
 * (detection + model bootstrap) -> capabilities announcement dialog -> app.
 * Runs device performance detection on startup, stages progress through CPU,
 * memory, GPU, WebGL, WebGPU, frame rate, speech synthesis, transcription,
 * and AI provider checks, and owns the startup completion latch plus a 45s
 * failsafe that never strands the user. Exposed on
 * `window.__innerviewForceStartup` as a dev/testing escape hatch.
 * @param onComplete - Callback fired when startup finishes (capabilities
 * confirmed, or immediately when disclaimer + capabilities were confirmed
 * on a previous launch).
 * @returns Performance startup state and actions.
 * @example
 * ```tsx
 * const { isDetecting, progress, stages, handleDisclaimerAccept,
 *   handleCapabilitiesConfirm } =
 *   usePerformanceStartup(() => setStartupComplete(true));
 * ```
 */
export function usePerformanceStartup(
  onComplete: () => void
): PerformanceStartupState {
  const [isDetecting, setIsDetecting] = useState(true);
  const [disclaimerAccepted, setDisclaimerAcceptedState] = useState(() =>
    getDisclaimerAccepted()
  );
  const [showDisclaimer, setShowDisclaimer] = useState(
    () => !getDisclaimerAccepted()
  );
  const [showRejected, setShowRejected] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
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
  const [isModelPreloading, setIsModelPreloading] = useState(false);
  const savePerformanceSettings = useSettingsStore(
    (state) => state.savePerformanceSettings
  );
  const getPerformanceSettings = useSettingsStore(
    (state) => state.getPerformanceSettings
  );
  const updateTranscriptionSettings = useSettingsStore(
    (state) => state.updateTranscriptionSettings
  );
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  // Prevent duplicate transcription test when effect runs twice (e.g. Strict Mode or HMR)
  const transcriptionTestStartedRef = useRef(false);
  // Latest metrics (kept in a ref so the capabilities confirm handler can use them)
  const latestMetricsRef = useRef<PerformanceMetrics | null>(null);
  // Latest onComplete callback (ref avoids stale closures in async flow)
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  // Guards so startup completes exactly once
  const startupFinishedRef = useRef(false);
  // Bootstrap latch: once startup has finished, no model preload may ever
  // start again. Guards against the detection effect re-running
  // post-bootstrap (e.g. parent re-renders) triggering new downloads.
  const bootstrapFinishedRef = useRef(false);
  // Mirrors isModelPreloading state for the global failsafe timer.
  const isModelPreloadingRef = useRef(false);

  /**
   * Move from detection to the capabilities dialog or app.
   * The disclaimer is accepted before detection ever runs (it is step 1),
   * so this only gates on the capabilities confirmation.
   */
  const finishStartup = () => {
    if (startupFinishedRef.current) return;
    startupFinishedRef.current = true;
    // Latch before the app mounts: any later preload attempt is a no-op.
    bootstrapFinishedRef.current = true;
    setIsDetecting(false);
    if (getCapabilitiesConfirmed()) {
      onCompleteRef.current();
    } else {
      setShowCapabilities(true);
    }
  };

  // Dev/testing escape hatch: force past detection if a probe stalls.
  if (typeof window !== 'undefined') {
    (
      window as unknown as { __innerviewForceStartup?: () => void }
    ).__innerviewForceStartup = finishStartup;
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
    // The disclaimer is step 1 of bootstrap: detection only runs after it
    // is accepted. `disclaimerAccepted` is a dep so accepting re-runs the
    // effect and starts detection.
    if (!disclaimerAccepted) {
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

          // Check if we should preload models.
          // Cloud-first: server-side NVIDIA NIM handles compute-heavy work,
          // so overburdened hardware never downloads local models — it uses
          // the server path announced in the capabilities dialog instead.
          const overburdened = isHardwareOverburdened(detectedMetrics);
          const autoPreload =
            !overburdened &&
            (detectedMetrics.tier === 'medium' ||
              detectedMetrics.tier === 'high');

          console.log('[PerformanceStartup] First run detection:', {
            tier: detectedMetrics.tier,
            supportsLocalTranscription:
              detectedMetrics.supportsLocalTranscription,
            supportsWebGPU: detectedMetrics.supportsWebGPU,
            overburdened,
            autoPreload,
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

          if (autoPreload && shouldPreloadWhisper(detectedMetrics)) {
            // Whisper is a bootstrapping step (backend, default path):
            // preload regardless of browser WASM (supportsLocalTranscription).
            // Only preload when the microphone is usable; otherwise there's no
            // transcription input to feed it.
            await startWhisperPreload();
            scheduleIdleCallback(() => {
              void startKokoroPreload(detectedMetrics);
            });
          } else if (overburdened) {
            // Overburdened hardware skips local model downloads entirely:
            // transcription and generation run on server-side NVIDIA NIM.
            console.log(
              '[PerformanceStartup] Overburdened hardware: skipping local model preload (server compute will be used).'
            );
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

          // Cloud-first: overburdened devices skip local model downloads and
          // use server-side NVIDIA NIM instead (announced in capabilities).
          const cachedOverburdened = isHardwareOverburdened(cached);

          // Preload backend Whisper on cached runs so it's ready for first
          // transcription (avoids post-bootstrap on-demand load).
          const shouldTestTranscription =
            cached.tier === 'medium' || cached.tier === 'high';

          console.log('[PerformanceStartup] Cached run:', {
            tier: cached.tier,
            supportsLocalTranscription: cached.supportsLocalTranscription,
            shouldTestTranscription,
            overburdened: cachedOverburdened,
          });

          if (
            shouldTestTranscription &&
            !cachedOverburdened &&
            shouldPreloadWhisper(cached) &&
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
          supportsMicrophone: false,
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
        // Detection is a pure checklist: nothing blocks on a decision here.
        // (Cloud-first: overburdened hardware skips local preloads and uses
        // server-side NVIDIA NIM, confirmed in the capabilities dialog.)
        if (!aborted) {
          finishStartup();
        }
      }
    }

    void detectAndConfigure();
    // Global failsafe: detection/animation must never strand the user on the
    // bootstrap screen (e.g. rAF/timer stalls in headless or a hung probe).
    // Does not fire while an intentional Whisper preload is showing progress.
    const failsafeId = window.setTimeout(() => {
      if (
        !aborted &&
        !startupFinishedRef.current &&
        !isModelPreloadingRef.current
      ) {
        console.warn(
          '[PerformanceStartup] Failsafe: forcing startup completion'
        );
        finishStartup();
      }
    }, 45000);
    // NOTE: `onComplete` deliberately excluded — finishStartup uses onCompleteRef.
    // `disclaimerAccepted` re-runs detection after the disclaimer is accepted.
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
    checkProvider,
    disclaimerAccepted,
  ]);

  /**
   * Accept the standalone disclaimer (step 1). Persists acceptance and
   * starts the prelaunch detection checklist.
   */
  const handleDisclaimerAccept: PerformanceStartupState['handleDisclaimerAccept'] =
    () => {
      setDisclaimerAccepted();
      setDisclaimerAcceptedState(true);
      setShowDisclaimer(false);
    };

  /**
   * Confirm the announced capabilities (step 3). Persists the chosen
   * performance tier and transcription compute path, then enters the app.
   * No API endpoint/key entry is required: compute-heavy work runs on
   * server-provided NVIDIA NIM.
   */
  const handleCapabilitiesConfirm: PerformanceStartupState['handleCapabilitiesConfirm'] =
    (selectedTier, transcriptionMode) => {
      const detectedMetrics = latestMetricsRef.current ?? metrics;
      if (detectedMetrics) {
        savePerformanceSettings(
          getPerformanceSettingsForTier(detectedMetrics, selectedTier)
        );
      }
      updateTranscriptionSettings({
        provider: 'local',
        local: {
          mode: transcriptionMode === 'browser' ? 'browser' : 'backend',
        },
      });
      setCapabilitiesConfirmed();
      setShowCapabilities(false);
      onCompleteRef.current();
    };

  /**
   * Server compute is always recommended: chat and transcription run on
   * our NVIDIA NIM infrastructure, so the device never needs the compute
   * to run a local model and transcription at the same time. Users with
   * capable hardware may still choose on-device transcription.
   */
  const recommendedTranscription: TranscriptionMode = 'server';

  const providerLabel =
    providerStatus?.status === 'available'
      ? `Chat and transcription run on server-provided NVIDIA NIM compute (${providerStatus.modelsAvailable ?? 'many'} models available). No API key or endpoint entry required.`
      : 'Chat and transcription run on server-provided NVIDIA NIM compute. No API key or endpoint entry required.';

  return {
    isDetecting,
    showDisclaimer,
    showRejected,
    showCapabilities,
    recommendedTranscription,
    providerLabel,
    metrics,
    progress,
    currentStage,
    stages,
    providerStatus,
    kokoroProgress,
    whisperProgress,
    isModelPreloading,
    setShowDisclaimer,
    setShowRejected,
    handleDisclaimerAccept,
    handleCapabilitiesConfirm,
  };
}
