import { useSystemDataSource } from '@/hooks/useSystemDataSource';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type {
  CircularWaveformProps,
  WaveformLayer,
  WaveformSettings,
} from './types';
import { DEFAULT_LAYERS, DEFAULT_SETTINGS } from './types';

/**
 * @file Circular waveform data hook — resolves waveform samples from either
 * a media element analyser node, an external (streaming) analyser, or an
 * idle-mode system data source. Owns the audio graph lifecycle.
 */

/** Result returned by {@link useCircularWaveformData}. */
export interface CircularWaveformDataResult {
  readonly effectiveSettings: WaveformSettings;
  readonly systemDataSource: ReturnType<typeof useSystemDataSource>;
  readonly settingsRef: RefObject<WaveformSettings>;
  readonly pulsePhase: number;
  readonly baseWaveformData: readonly number[];
  readonly layers: readonly WaveformLayer[];
}

export function useCircularWaveformData({
  isActive,
  audioElement,
  analyserNode: externalAnalyserNode,
  useSpeechSynthesis = false,
  isIdle = false,
  layers: customLayers,
  settings = DEFAULT_SETTINGS,
  systemDataSource: externalSystemDataSource,
}: CircularWaveformProps): CircularWaveformDataResult {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [baseWaveformData, setBaseWaveformData] = useState<number[]>([]);
  const settingsRef = useRef<WaveformSettings>(settings);

  // Use external systemDataSource if provided, otherwise create internal one
  const internalSystemDataSource = useSystemDataSource(isIdle, 4000);
  const systemDataSource = externalSystemDataSource || internalSystemDataSource;

  // Merge user settings with source-specific settings when idle (preserve colors in layers)
  const effectiveSettings = useMemo(
    () =>
      isIdle && systemDataSource.currentSource.waveformSettings
        ? {
            ...settings,
            ...systemDataSource.currentSource.waveformSettings,
          }
        : settings,
    [isIdle, settings, systemDataSource.currentSource.waveformSettings]
  );

  // Update settings ref when settings change (for real-time updates)
  useEffect(() => {
    settingsRef.current = effectiveSettings;
  }, [effectiveSettings]);

  // Get layers
  const layers =
    customLayers && customLayers.length > 0 ? customLayers : DEFAULT_LAYERS;

  // Pulse animation for idle state
  useEffect(() => {
    if (!isIdle || !effectiveSettings.breathingEnabled) {
      setPulsePhase(0);
      return;
    }

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setPulsePhase(
        (prev) => (prev + effectiveSettings.breathingSpeed) % (Math.PI * 2)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [
    isIdle,
    effectiveSettings.breathingEnabled,
    effectiveSettings.breathingSpeed,
  ]);

  // Store the latest getData function in a ref to avoid stale closures
  const getDataRef = useRef(systemDataSource.getData);
  const systemDataSourceRef = useRef(systemDataSource);

  // Update refs when systemDataSource changes (but don't trigger re-render)
  // Using empty deps to avoid running on every render - refs update on systemDataSource change via the outer closure
  useEffect(() => {
    systemDataSourceRef.current = systemDataSource;
    getDataRef.current = systemDataSource.getData;
  }, [systemDataSource]);

  // Update waveform data from system sources when idle (separate from audio)
  useEffect(() => {
    if (!isIdle || isPlaying || !isActive) {
      return;
    }

    let frameId: number;
    let lastUpdate = 0;
    const updateSystemData = (t: number) => {
      // Throttle to ~10fps: idle system data changes slowly, and each
      // update triggers a React re-render of the waveform scene.
      if (t - lastUpdate < 100) {
        frameId = requestAnimationFrame(updateSystemData);
        return;
      }
      lastUpdate = t;
      // Use ref to get latest values without causing re-renders
      const currentGetData = getDataRef.current;
      if (isIdle && !isPlaying && isActive && currentGetData) {
        const systemData = currentGetData(settings.pointCount);
        if (systemData.length > 0) {
          setBaseWaveformData(systemData);
        }
        frameId = requestAnimationFrame(updateSystemData);
      }
    };

    frameId = requestAnimationFrame(updateSystemData);
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isIdle, isPlaying, isActive, settings.pointCount]);

  // Audio setup. Note: `isPlaying` is intentionally not a dependency —
  // `setIsPlaying` is called by play/pause handlers and the initial check,
  // and including it would tear down and re-run this effect on every toggle
  // (the previous cleanup also reset `isPlaying`, looping forever).
  useEffect(() => {
    // If external analyser node provided (streaming), use it directly
    if (externalAnalyserNode) {
      analyserRef.current = externalAnalyserNode;
      const bufferLength = externalAnalyserNode.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      setIsPlaying(isActive);
      return;
    }

    // Otherwise, use audio element (file playback or fallback)
    if (!isActive || !audioElement) {
      setIsPlaying(false);
      setBaseWaveformData([]);
      return;
    }

    // `alive` gates the rAF recursion after unmount/deps change so no frame
    // is scheduled on a dead effect; `rafHolder` lets cleanup cancel the
    // pending frame.
    let alive = true;
    const rafHolder = { id: 0 };
    let lastWaveUpdate = 0;

    const setupAudioVisualization = async () => {
      try {
        if (!audioContextRef.current) {
          // Support both standard AudioContext and webkit-prefixed version
          const AudioContextClass =
            window.AudioContext ||
            (
              window as typeof window & {
                webkitAudioContext?: typeof AudioContext;
              }
            ).webkitAudioContext;
          if (!AudioContextClass) {
            throw new Error('AudioContext is not supported in this browser');
          }
          audioContextRef.current = new AudioContextClass();
        }

        const audioContext = audioContextRef.current;

        if (!analyserRef.current) {
          analyserRef.current = audioContext.createAnalyser();
          analyserRef.current.fftSize = 2048;
          analyserRef.current.smoothingTimeConstant = 0.3;
        }

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        if (!sourceRef.current) {
          sourceRef.current =
            audioContext.createMediaElementSource(audioElement);
          sourceRef.current.connect(analyser);
          analyser.connect(audioContext.destination);
        }

        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);

        audioElement.addEventListener('play', handlePlay);
        audioElement.addEventListener('pause', handlePause);
        audioElement.addEventListener('ended', handleEnded);

        setIsPlaying(!audioElement.paused && !audioElement.ended);

        // Update waveform data. The previous version only recursed when the
        // (stale) closed-over `isPlaying` was true, which it never was at
        // effect time (false until the play handler fires), so only the
        // first frame ever ran and the waveform froze. Recurse while this
        // effect is alive instead.
        const updateWaveform = (t: number) => {
          if (!alive) return;
          // Throttle state updates to ~30fps; the scene interpolates
          // visually via its own frame loop.
          if (t - lastWaveUpdate < 33) {
            rafHolder.id = requestAnimationFrame(updateWaveform);
            return;
          }
          lastWaveUpdate = t;
          if (
            analyser &&
            dataArrayRef.current &&
            !useSpeechSynthesis &&
            effectiveSettings.pointCount > 0
          ) {
            analyser.getByteTimeDomainData(dataArrayRef.current);
            const data: number[] = [];
            for (let i = 0; i < effectiveSettings.pointCount; i++) {
              const index = Math.floor(
                (i / effectiveSettings.pointCount) * dataArrayRef.current.length
              );
              const value = (dataArrayRef.current[index] - 128) / 128;
              data.push(value);
            }
            setBaseWaveformData(data);
          }
          rafHolder.id = requestAnimationFrame(updateWaveform);
        };

        updateWaveform(0);

        return () => {
          audioElement.removeEventListener('play', handlePlay);
          audioElement.removeEventListener('pause', handlePause);
          audioElement.removeEventListener('ended', handleEnded);
        };
      } catch (error) {
        console.error('Error setting up audio visualization:', error);
        return () => {};
      }
    };

    let disposed = false;
    let cleanup: (() => void) | undefined;
    setupAudioVisualization().then((cleanupFn) => {
      // Effect may have been cleaned up before the async setup resolved;
      // run the listener cleanup immediately in that case.
      if (disposed) {
        cleanupFn?.();
      } else {
        cleanup = cleanupFn;
      }
    });

    return () => {
      disposed = true;
      alive = false;
      cancelAnimationFrame(rafHolder.id);
      if (!isIdle) {
        setBaseWaveformData([]);
      }
      if (cleanup) cleanup();
    };
  }, [
    isActive,
    audioElement,
    externalAnalyserNode,
    useSpeechSynthesis,
    effectiveSettings.pointCount,
    isIdle,
  ]);

  return {
    effectiveSettings,
    systemDataSource,
    settingsRef,
    pulsePhase,
    baseWaveformData,
    layers,
  };
}
