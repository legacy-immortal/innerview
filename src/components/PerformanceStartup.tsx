// Startup component that detects performance and configures app accordingly
import type { DetectionStageDisplay } from '@/components/DisclaimerDialog';
import { DisclaimerDialog } from '@/components/DisclaimerDialog';
import { SystemOfflineView } from '@/components/SystemOfflineView';
import { Hypnotic } from '@/components/animations/Hypnotic';
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
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

interface PerformanceStartupProps {
  onComplete: () => void;
  children: React.ReactNode;
}

interface DetectionStage {
  name: string;
  status: 'pending' | 'detecting' | 'complete' | 'error';
  value?: string;
  isError?: boolean;
}

function buildStagesFromMetrics(metrics: PerformanceMetrics): DetectionStage[] {
  const transcriptionStatus = [];
  if (metrics.supportsMediaRecorder) transcriptionStatus.push('MediaRecorder');
  if (metrics.supportsGetUserMedia) transcriptionStatus.push('Microphone');
  if (metrics.supportsLocalTranscription) transcriptionStatus.push('Local');
  return [
    {
      name: 'CPU Cores',
      status: 'complete',
      value: `${metrics.hardwareConcurrency} cores`,
    },
    {
      name: 'System Memory',
      status: 'complete',
      value: metrics.deviceMemory ? `${metrics.deviceMemory} GB` : 'Unknown',
    },
    {
      name: 'GPU Tier',
      status: 'complete',
      value: metrics.gpuTier?.toUpperCase() || 'UNKNOWN',
    },
    {
      name: 'WebGL Support',
      status: 'complete',
      value: metrics.supportsWebGL2 ? 'YES' : 'NO',
    },
    {
      name: 'WebGPU Support',
      status: 'complete',
      value: metrics.supportsWebGPU ? 'YES' : 'NO',
    },
    {
      name: 'Frame Rate',
      status: 'complete',
      value: `${metrics.frameRate} FPS`,
    },
    {
      name: 'Speech Synthesis',
      status: 'complete',
      value: metrics.supportsSpeechSynthesis
        ? `YES (${metrics.availableVoices} voices)`
        : 'NO',
    },
    {
      name: 'Transcription',
      status: 'complete',
      value:
        transcriptionStatus.length > 0 ? transcriptionStatus.join(', ') : 'NO',
    },
    { name: 'AI Provider', status: 'complete', value: 'CHECK' },
    {
      name: 'Performance Score',
      status: 'complete',
      value: `${metrics.score}/100 (${metrics.tier.toUpperCase()})`,
    },
  ];
}

const STAGE_ANIMATION_DELAY_MS = 120;
const PROGRESS_STEPS = [12, 20, 28, 36, 44, 52, 60, 68, 76, 90, 100];

async function runCachedInitAnimation(
  completedStages: DetectionStage[],
  setProgress: (n: number) => void,
  setCurrentStage: (n: number) => void,
  setStages: React.Dispatch<React.SetStateAction<DetectionStage[]>>
) {
  setProgress(0);
  setStages(
    completedStages.map((s) => ({ name: s.name, status: 'pending' as const }))
  );
  for (let i = 0; i < completedStages.length; i++) {
    await new Promise((r) => setTimeout(r, STAGE_ANIMATION_DELAY_MS));
    setCurrentStage(i);
    setStages((prev) => {
      const next = [...prev];
      next[i] = {
        ...completedStages[i],
        status: completedStages[i].status as DetectionStage['status'],
      };
      return next;
    });
    setProgress(PROGRESS_STEPS[Math.min(i, PROGRESS_STEPS.length - 1)] ?? 100);
  }
  setProgress(100);
  await new Promise((r) => setTimeout(r, 300));
}

export function PerformanceStartup({
  onComplete,
  children,
}: PerformanceStartupProps) {
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

  if (isDetecting) {
    // Only show background animation when detection has run and determined the system can handle it
    const showBackground =
      metrics && metrics.tier !== 'low' && metrics.supportsWebGL2;
    const tierColor =
      metrics?.tier === 'high'
        ? 'emerald'
        : metrics?.tier === 'medium'
          ? 'cyan'
          : 'gray';

    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="black"
        zIndex={9999}
        overflow="hidden"
      >
        {/* Background animation - only for medium/high tier devices */}
        {showBackground && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            opacity={metrics.tier === 'high' ? 0.3 : 0.15}
          >
            <Hypnotic
              settings={{
                intensity: metrics.tier === 'high' ? 0.4 : 0.2,
                primaryColor1: [0.2, 0.8, 0.6],
                primaryColor2: [0.1, 0.3, 0.2],
                secondaryColor1: [0.3, 0.9, 0.7],
                secondaryColor2: [0.15, 0.4, 0.25],
                tertiaryColor1: [0.25, 0.85, 0.65],
                tertiaryColor2: [0.05, 0.2, 0.15],
                breathingEnabled: true,
                breathingSpeed: 0.5,
                breathingIntensity: 0.1,
                particlesEnabled: metrics.tier === 'high',
                particlesCount: metrics.tier === 'high' ? 20 : 0,
                particlesOpacity: 0.3,
                rotationSpeed1: 0.1,
                rotationSpeed2: 0.15,
                rotationSpeed3: 0.05,
              }}
            />
          </Box>
        )}

        {/* Terminal-style loading interface */}
        <VStack
          gap={4}
          align="stretch"
          w="90%"
          maxW="600px"
          position="relative"
          zIndex={1}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
        >
          {/* Header */}
          <HStack gap={2} align="baseline">
            <Text
              fontSize="xs"
              color="gray.500"
              letterSpacing="0.05em"
              css={{
                textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
              }}
            >
              {new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </Text>
            <Text
              fontSize="xs"
              color={`${tierColor}.400`}
              fontWeight={600}
              letterSpacing="0.1em"
              css={{
                textShadow: `0 0 8px rgba(${
                  tierColor === 'emerald'
                    ? '16, 185, 129'
                    : tierColor === 'cyan'
                      ? '6, 182, 212'
                      : '156, 163, 175'
                }, 0.5), 0 0 16px rgba(${
                  tierColor === 'emerald'
                    ? '16, 185, 129'
                    : tierColor === 'cyan'
                      ? '6, 182, 212'
                      : '156, 163, 175'
                }, 0.3)`,
              }}
            >
              [SYSTEM]
            </Text>
            <Text
              fontSize="xs"
              color="gray.400"
              css={{
                textShadow: '0 0 4px rgba(255, 255, 255, 0.05)',
              }}
            >
              ›
            </Text>
          </HStack>

          {/* Title */}
          <Text
            fontSize="lg"
            color="gray.200"
            fontWeight={600}
            letterSpacing="0.05em"
            css={{
              textShadow: '0 0 8px rgba(255, 255, 255, 0.1)',
            }}
          >
            PERFORMANCE DETECTION
          </Text>

          {/* Detection stages */}
          <VStack gap={2} align="stretch" mt={2}>
            {stages.map((stage, index) => {
              const isActive = index <= currentStage;
              const isDetecting = stage.status === 'detecting';
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
                        : isDetecting
                          ? 'yellow.400'
                          : 'gray.600'
                  }
                  letterSpacing="0.05em"
                  css={{
                    textShadow:
                      isActive && !isDetecting
                        ? `0 0 4px rgba(${
                            isError
                              ? '239, 68, 68'
                              : tierColor === 'emerald'
                                ? '16, 185, 129'
                                : tierColor === 'cyan'
                                  ? '6, 182, 212'
                                  : '156, 163, 175'
                          }, 0.3)`
                        : 'none',
                  }}
                >
                  <Text w="12px" textAlign="right">
                    {isError ? '✗' : isComplete ? '✓' : isDetecting ? '→' : '○'}
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
                  {isDetecting && (
                    <Text color="yellow.400" animation="pulse 1s infinite">
                      ...
                    </Text>
                  )}
                </HStack>
              );
            })}
          </VStack>

          {/* Progress bar */}
          <Box mt={4}>
            <Box
              w="100%"
              h="4px"
              bg="rgba(255, 255, 255, 0.05)"
              border="1px solid"
              borderColor="rgba(255, 255, 255, 0.1)"
              borderRadius="none"
              position="relative"
              overflow="hidden"
            >
              {/* Progress fill */}
              <Box
                h="100%"
                bg={`${tierColor}.400`}
                width={`${progress}%`}
                transition="width 0.2s step-end"
                css={{
                  boxShadow: `0 0 8px rgba(${
                    tierColor === 'emerald'
                      ? '16, 185, 129'
                      : tierColor === 'cyan'
                        ? '6, 182, 212'
                        : '156, 163, 175'
                  }, 0.5)`,
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '8px',
                    bg: `${tierColor}.300`,
                    boxShadow: `0 0 4px rgba(${
                      tierColor === 'emerald'
                        ? '16, 185, 129'
                        : tierColor === 'cyan'
                          ? '6, 182, 212'
                          : '156, 163, 175'
                    }, 0.8)`,
                  },
                }}
              />
              {/* Grid overlay for terminal aesthetic */}
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                css={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 7px,
                      rgba(255, 255, 255, 0.02) 7px,
                      rgba(255, 255, 255, 0.02) 8px
                    )
                  `,
                  pointerEvents: 'none',
                }}
              />
            </Box>
            <Text
              fontSize="xs"
              color="gray.500"
              textAlign="right"
              letterSpacing="0.1em"
              mt={1}
              css={{
                textShadow: '0 0 2px rgba(255, 255, 255, 0.1)',
              }}
            >
              {progress}%
            </Text>
          </Box>

          {/* Status message */}
          <Text
            fontSize="xs"
            color="gray.500"
            letterSpacing="0.05em"
            mt={2}
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.05)',
            }}
          >
            {metrics
              ? `Detected ${metrics.tier.toUpperCase()} performance tier`
              : 'Initializing detection routines...'}
          </Text>

          {/* Provider warning */}
          {providerStatus &&
            providerStatus.status !== 'available' &&
            providerStatus.status !== 'checking' && (
              <Box
                mt={3}
                p={3}
                bg="rgba(239, 68, 68, 0.1)"
                border="1px solid"
                borderColor="rgba(239, 68, 68, 0.3)"
                borderRadius="none"
              >
                <Text
                  fontSize="xs"
                  color="red.400"
                  fontWeight={600}
                  letterSpacing="0.05em"
                  mb={1}
                >
                  AI PROVIDER UNAVAILABLE
                </Text>
                <Text fontSize="xs" color="red.300" letterSpacing="0.02em">
                  {providerStatus.error}
                </Text>
                {providerStatus.suggestion && (
                  <Text
                    fontSize="xs"
                    color="gray.400"
                    mt={2}
                    letterSpacing="0.02em"
                  >
                    {providerStatus.suggestion}
                  </Text>
                )}
              </Box>
            )}

          {/* Model download progress */}
          {(kokoroProgress || whisperProgress) && (
            <VStack gap={2} align="stretch" mt={4}>
              {kokoroProgress && (
                <Box>
                  <HStack gap={2} mb={1}>
                    <Text
                      fontSize="xs"
                      color={
                        kokoroProgress.status === 'complete'
                          ? `${tierColor}.400`
                          : kokoroProgress.status === 'error'
                            ? 'red.400'
                            : 'gray.400'
                      }
                      letterSpacing="0.05em"
                    >
                      Kokoro TTS
                    </Text>
                    <Text fontSize="xs" color="gray.500" letterSpacing="0.1em">
                      {kokoroProgress.progress}%
                    </Text>
                  </HStack>
                  <Box
                    w="100%"
                    h="2px"
                    bg="rgba(255, 255, 255, 0.05)"
                    border="1px solid"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    borderRadius="none"
                    position="relative"
                    overflow="hidden"
                  >
                    <Box
                      h="100%"
                      bg={
                        kokoroProgress.status === 'complete'
                          ? `${tierColor}.400`
                          : kokoroProgress.status === 'error'
                            ? 'red.400'
                            : `${tierColor}.400`
                      }
                      width={`${kokoroProgress.progress}%`}
                      transition="width 0.2s ease-out"
                      css={{
                        boxShadow: `0 0 4px rgba(${
                          kokoroProgress.status === 'error'
                            ? '239, 68, 68'
                            : tierColor === 'emerald'
                              ? '16, 185, 129'
                              : tierColor === 'cyan'
                                ? '6, 182, 212'
                                : '156, 163, 175'
                        }, 0.5)`,
                      }}
                    />
                  </Box>
                </Box>
              )}

              {whisperProgress && (
                <Box>
                  <HStack gap={2} mb={1}>
                    <Text
                      fontSize="xs"
                      color={
                        whisperProgress.status === 'complete'
                          ? `${tierColor}.400`
                          : whisperProgress.status === 'error'
                            ? 'red.400'
                            : 'gray.400'
                      }
                      letterSpacing="0.05em"
                    >
                      Whisper Transcription
                    </Text>
                    <Text fontSize="xs" color="gray.500" letterSpacing="0.1em">
                      {whisperProgress.progress}%
                    </Text>
                  </HStack>
                  <Box
                    w="100%"
                    h="2px"
                    bg="rgba(255, 255, 255, 0.05)"
                    border="1px solid"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    borderRadius="none"
                    position="relative"
                    overflow="hidden"
                  >
                    <Box
                      h="100%"
                      bg={
                        whisperProgress.status === 'complete'
                          ? `${tierColor}.400`
                          : whisperProgress.status === 'error'
                            ? 'red.400'
                            : `${tierColor}.400`
                      }
                      width={`${whisperProgress.progress}%`}
                      transition="width 0.2s ease-out"
                      css={{
                        boxShadow: `0 0 4px rgba(${
                          whisperProgress.status === 'error'
                            ? '239, 68, 68'
                            : tierColor === 'emerald'
                              ? '16, 185, 129'
                              : tierColor === 'cyan'
                                ? '6, 182, 212'
                                : '156, 163, 175'
                        }, 0.5)`,
                      }}
                    />
                  </Box>
                </Box>
              )}
            </VStack>
          )}
        </VStack>
      </Box>
    );
  }

  if (showRejected) {
    return <SystemOfflineView />;
  }

  if (showDisclaimer && metrics) {
    const recommendedTier = getPerformanceSettings()?.tier ?? metrics.tier;
    const currentGeneration = getGenerationSettings();
    return (
      <DisclaimerDialog
        metrics={metrics}
        stages={stages as DetectionStageDisplay[]}
        recommendedTier={recommendedTier}
        detectedProviders={detectedProviders}
        initialBaseURL={currentGeneration?.baseURL}
        initialApiKey={currentGeneration?.apiKey}
        onAccept={(selectedTier, providerConfig) => {
          savePerformanceSettings(
            getPerformanceSettingsForTier(metrics, selectedTier)
          );
          updateGenerationSettings({
            baseURL: providerConfig.baseURL,
            apiKey: providerConfig.apiKey ?? '',
          });
          setDisclaimerAccepted();
          setShowDisclaimer(false);
          onComplete();
        }}
        onReject={() => setShowRejected(true)}
      />
    );
  }

  return <>{children}</>;
}
