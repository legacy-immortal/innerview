/**
 * @file Detection stage helpers that turn performance metrics into startup checklist stages.
 * @module lib/performanceStartupUtils.ts
 */
// Detection stage helpers (extracted from PerformanceStartup.tsx).
import type { PerformanceMetrics } from '@/lib/performance-detector';
export interface DetectionStage {
  name: string;
  status: 'pending' | 'detecting' | 'complete' | 'error';
  value?: string;
  isError?: boolean;
}

export function buildStagesFromMetrics(
  metrics: PerformanceMetrics
): DetectionStage[] {
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

export const STAGE_ANIMATION_DELAY_MS = 120;
export const PROGRESS_STEPS = [12, 20, 28, 36, 44, 52, 60, 68, 76, 90, 100];

export async function runCachedInitAnimation(
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
