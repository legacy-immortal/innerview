/**
 * @file useSystemDataSource.ts — System visualization data source hook (frame timing, network, backend, time, context).
 * @module hooks/useSystemDataSource
 *
 * System visualization data source hook. Provides waveform/gauge/pie/clock
 * data sources (network activity, frame timing, backend status, time, context
 * usage) with a reference-counted, opt-in collector lifecycle (rAF frame
 * timing + network PerformanceObserver, throttled and paused while hidden).
 * Exposes current source, cycling, label visibility, getData/getValue, and
 * navigation between visualization types.
 */
import type { WaveformSettings } from '@/components/background/BackgroundControlPanel';
import { getLatestBackendStatus } from '@/lib/backend-status';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** A system visualization data source producing waveform or gauge data. */
export type DataSource = {
  /** Stable source id. */
  id: string;
  /** Human-readable source name. */
  name: string;
  /** Human-readable description. */
  description: string;
  /** Produce `pointCount` samples at the given time. */
  getData: (pointCount: number, time: number) => number[];
  /** Optional waveform settings override. */
  waveformSettings?: Partial<WaveformSettings>;
  /** Visualization type rendered for this source. */
  visualizationType?: 'waveform' | 'gauge' | 'pie' | 'clock';
  /** Optional gauge/single value (may be a promise for async sources). */
  getValue?: () =>
    | number
    | { value: number; max: number }
    | { hours: number; minutes: number; seconds: number }
    | Promise<{ value: number; max: number }>;
  /** Returns recent sample buffer for sparkline-style visualization (e.g. FPS history). */
  getSparkData?: () => number[];
};

// Real-time frame timing + network activity buffers (shared across hook instances).
// The collectors that fill these buffers are opt-in: they only run while at least
// one useSystemDataSource instance is mounted with isIdle=true (visualizations shown),
// they are throttled, and they pause while the document is hidden.
let frameTimingBuffer: number[] = [];
let fpsBuffer: number[] = [];
let lastFrameTime = 0;
const FRAME_TIMING_BUFFER_SIZE = 512;
const FPS_BUFFER_SIZE = 300;
const FRAME_SAMPLE_INTERVAL_MS = 33; // throttle buffer writes to ~30Hz max
let lastFrameSampleTime = 0;

const sampleFrameTiming = () => {
  const now = performance.now();
  const frameDurationMs = lastFrameTime === 0 ? 16.67 : now - lastFrameTime;
  lastFrameTime = now;

  // Throttle buffer writes; FPS still derived from the instantaneous delta.
  if (
    lastFrameSampleTime !== 0 &&
    now - lastFrameSampleTime < FRAME_SAMPLE_INTERVAL_MS
  ) {
    return;
  }
  lastFrameSampleTime = now;

  const fps = frameDurationMs > 0 ? 1000 / frameDurationMs : 0;
  fpsBuffer.push(fps);
  if (fpsBuffer.length > FPS_BUFFER_SIZE) {
    fpsBuffer.shift();
  }

  // Normalize frame duration (target 16.67ms for 60fps) for waveform use
  const normalized = ((frameDurationMs - 16.67) / 16.67) * 0.5;
  const clamped = Math.max(-1, Math.min(1, normalized));
  frameTimingBuffer.push(clamped);
  if (frameTimingBuffer.length > FRAME_TIMING_BUFFER_SIZE) {
    frameTimingBuffer.shift();
  }
};

const getFrameTimingData = (pointCount: number, _time: number): number[] => {
  const data: number[] = [];
  const bufferLength = frameTimingBuffer.length;

  if (bufferLength === 0) {
    return new Array(pointCount).fill(0);
  }

  for (let i = 0; i < pointCount; i++) {
    const index = Math.floor((i / pointCount) * bufferLength);
    const value = frameTimingBuffer[index] ?? 0;
    data.push(value);
  }

  return data;
};

/** Returns recent FPS samples for sparkline (newest last). */
const getFpsSparkData = (): number[] => fpsBuffer.slice();

// Real-time network activity data (using Performance Observer API)
let networkActivityBuffer: number[] = [];
let networkCountBuffer: number[] = [];
let networkRequestCount = 0;
const NETWORK_CHECK_INTERVAL = 50;
const NETWORK_BUFFER_SIZE = 256;
const NETWORK_COUNT_BUFFER_SIZE = 300;
let performanceObserver: PerformanceObserver | null = null;

const sampleNetworkActivity = () => {
  networkCountBuffer.push(networkRequestCount);
  if (networkCountBuffer.length > NETWORK_COUNT_BUFFER_SIZE) {
    networkCountBuffer.shift();
  }

  const activityLevel = Math.min(networkRequestCount / 10, 1);
  const normalized = activityLevel * 2 - 1;
  networkActivityBuffer.push(normalized);
  if (networkActivityBuffer.length > NETWORK_BUFFER_SIZE) {
    networkActivityBuffer.shift();
  }

  networkRequestCount = 0;
};

// Opt-in collector lifecycle: reference-counted so multiple hook instances share
// one frame-timing rAF + one network interval. Started on first acquire, torn
// down on last release, and paused while document.hidden.
let collectorRefCount = 0;
let frameRafId: number | null = null;
let networkIntervalId: ReturnType<typeof setInterval> | null = null;
let visibilityListenerActive = false;

const ensureNetworkObserver = () => {
  if (performanceObserver != null) return;
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }
  try {
    performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (
          entry.entryType === 'resource' &&
          (entry as PerformanceResourceTiming).transferSize > 0
        ) {
          networkRequestCount++;
        }
      }
    });
    performanceObserver.observe({ entryTypes: ['resource'] });
  } catch {
    performanceObserver = null;
    // Performance Observer not supported or failed to initialize
  }
};

const disconnectNetworkObserver = () => {
  performanceObserver?.disconnect();
  performanceObserver = null;
};

const runFrameTimingLoop = () => {
  if (document.hidden) {
    frameRafId = null;
    return;
  }
  sampleFrameTiming();
  frameRafId = requestAnimationFrame(runFrameTimingLoop);
};

const startCollectors = () => {
  if (typeof window === 'undefined') return;
  // Reset frame baseline so resuming does not record a huge delta.
  lastFrameTime = performance.now();
  lastFrameSampleTime = 0;
  if (frameRafId == null && !document.hidden) {
    frameRafId = requestAnimationFrame(runFrameTimingLoop);
  }
  ensureNetworkObserver();
  if (networkIntervalId == null && !document.hidden) {
    networkIntervalId = setInterval(
      sampleNetworkActivity,
      NETWORK_CHECK_INTERVAL
    );
  }
};

const stopCollectors = () => {
  if (frameRafId != null) {
    cancelAnimationFrame(frameRafId);
    frameRafId = null;
  }
  if (networkIntervalId != null) {
    clearInterval(networkIntervalId);
    networkIntervalId = null;
  }
  disconnectNetworkObserver();
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopCollectors();
  } else if (collectorRefCount > 0) {
    startCollectors();
  }
};

const acquireCollectors = () => {
  collectorRefCount += 1;
  if (collectorRefCount === 1) {
    if (typeof document !== 'undefined' && !visibilityListenerActive) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityListenerActive = true;
    }
    startCollectors();
  }
};

const releaseCollectors = () => {
  collectorRefCount = Math.max(0, collectorRefCount - 1);
  if (collectorRefCount === 0) {
    stopCollectors();
    if (visibilityListenerActive && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      visibilityListenerActive = false;
    }
  }
};

const getNetworkActivityData = (
  pointCount: number,
  _time: number
): number[] => {
  const data: number[] = [];
  const bufferLength = networkActivityBuffer.length;

  if (bufferLength === 0) {
    return new Array(pointCount).fill(0);
  }

  for (let i = 0; i < pointCount; i++) {
    const index = Math.floor((i / pointCount) * bufferLength);
    const value = networkActivityBuffer[index] ?? 0;
    data.push(value);
  }

  return data;
};

/** Returns recent request counts per interval for network sparkline (newest last). */
const getNetworkSparkData = (): number[] => networkCountBuffer.slice();

// Time-based data
const getTimeData = (): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  return {
    hours: now.getHours() % 12,
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
  };
};

const DATA_SOURCES: DataSource[] = [
  {
    id: 'network',
    name: 'Network',
    description: 'Request activity',
    getData: getNetworkActivityData,
    getSparkData: getNetworkSparkData,
    waveformSettings: {
      pointCount: 256,
      breathingEnabled: true,
      breathingSpeed: 0.04,
      breathingIntensity: 0.01,
      radius: 0.3,
      barWidth: 0.02,
      barLengthMultiplier: 0.3,
      animationSpeed: 0.9,
      animationSpeedIrregular: 0.6,
      animationSpeedHighFreq: 1.1,
      amplitudePowerAudio: 0.65,
      amplitudePowerSynthetic: 0.85,
      glowOpacityBase: 0.15,
      glowOpacityRange: 0.01,
    },
  },
  {
    id: 'frametiming',
    name: 'Frame Timing',
    description: 'Render performance',
    getData: getFrameTimingData,
    getSparkData: getFpsSparkData,
    waveformSettings: {
      pointCount: 256,
      breathingEnabled: true,
      breathingSpeed: 0.02,
      breathingIntensity: 0.01,
      radius: 0.28,
      barWidth: 0.018,
      barLengthMultiplier: 0.3,
      animationSpeed: 0.5,
      animationSpeedIrregular: 0.3,
      animationSpeedHighFreq: 0.7,
      amplitudePowerAudio: 0.8,
      amplitudePowerSynthetic: 0.75,
      glowOpacityBase: 0.2,
      glowOpacityRange: 0.01,
    },
  },
  {
    id: 'context',
    name: 'Context',
    description: 'Model context',
    getData: () => [],
    visualizationType: 'gauge',
    getValue: undefined, // Supplied by hook from contextUsage param
  },
  {
    id: 'backend',
    name: 'Backend',
    description: 'CPU, memory & queue from /api/status',
    getData: (pointCount: number): number[] => {
      const snapshot = getLatestBackendStatus();
      const cpu = (snapshot?.cpu.usagePercent ?? 0) / 100; // 0..1
      const mem = (snapshot?.memory.usagePercent ?? 0) / 100; // 0..1
      const load = Math.min(1, Math.max(cpu, mem));
      // Map 0..1 load to -1..1 waveform, gently animated with time.
      return Array.from({ length: pointCount }, (_, i) => {
        const wave = Math.sin(i * 0.18 + Date.now() / 500) * 0.25;
        return Math.max(-1, Math.min(1, load * 2 - 1 + wave * load));
      });
    },
    visualizationType: 'gauge',
    getValue: () => {
      const snapshot = getLatestBackendStatus();
      if (!snapshot) return { value: 0, max: 100 };
      // Gauge shows the busier of CPU% and queue pressure.
      const queuePressure =
        (snapshot.requests.active + snapshot.queue.depth) * 25;
      return {
        value: Math.max(snapshot.cpu.usagePercent ?? 0, queuePressure),
        max: 100,
      };
    },
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Current time',
    getData: () => [], // Not used for clock
    visualizationType: 'clock',
    getValue: getTimeData,
  },
];

// Get unique visualization types and their corresponding source indices
const getVisualizationTypes = () => {
  const typeMap = new Map<'waveform' | 'gauge' | 'pie' | 'clock', number[]>();
  DATA_SOURCES.forEach((source, index) => {
    const type = source.visualizationType || 'waveform';
    if (!typeMap.has(type)) {
      typeMap.set(type, []);
    }
    typeMap.get(type)!.push(index);
  });
  return Array.from(typeMap.keys());
};

const VISUALIZATION_TYPES = getVisualizationTypes();

/** Source ids for UI (dropdown). Matches SystemVisualizationSourceId in settings-types. */
export const SYSTEM_SOURCE_IDS = DATA_SOURCES.map((s) => s.id);

/** { id, name } for system visualization source dropdown. */
export const SYSTEM_SOURCE_OPTIONS = DATA_SOURCES.map((s) => ({
  id: s.id,
  name: s.name,
}));

/**
 * System visualization data source hook.
 * Provides cycling through system visualization data sources (network,
 * frame timing, backend, time, context) with a reference-counted opt-in
 * collector lifecycle. While `isIdle` is true, frame-timing (rAF) and
 * network (PerformanceObserver) collectors run throttled and pause when the
 * document is hidden.
 * @param isIdle - Whether visualizations are shown (starts/stops collectors).
 * @param cycleInterval - Ms between auto-cycle advances (default 4000).
 * @param selectedSourceId - Manually selected source id (null/undefined = first).
 * @param cycleEnabled - Whether auto-cycling is enabled (default true).
 * @param contextUsage - Optional { used, max } for the context gauge source.
 * @returns Current source, label visibility, getData, visualizationType,
 * getValue, and navigateToVisualizationType.
 * @example
 * ```tsx
 * const { currentSource, getData, getValue, navigateToVisualizationType } =
 *   useSystemDataSource(isIdle, 4000, selectedSourceId, true, contextUsage);
 * ```
 */
export const useSystemDataSource = (
  isIdle: boolean,
  cycleInterval: number = 4000,
  selectedSourceId: string | null | undefined = undefined,
  cycleEnabled: boolean = true,
  contextUsage: { used: number; max: number } | null = null
) => {
  const resolvedInitialIndex =
    selectedSourceId != null && selectedSourceId !== ''
      ? DATA_SOURCES.findIndex((s) => s.id === selectedSourceId)
      : -1;
  const initialIndex = resolvedInitialIndex >= 0 ? resolvedInitialIndex : 0;

  const [currentSourceIndex, setCurrentSourceIndex] = useState(initialIndex);
  const [showSourceLabel, setShowSourceLabel] = useState(false);
  const timeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const manualNavigationRef = useRef(false);

  // Opt-in: only collect frame-timing/network samples while visualizations are shown.
  useEffect(() => {
    if (!isIdle) return;
    acquireCollectors();
    return () => {
      releaseCollectors();
    };
  }, [isIdle]);

  // When not cycling, keep current source in sync with selectedSourceId (or 0 if none selected)
  useEffect(() => {
    if (!cycleEnabled) {
      setCurrentSourceIndex(
        resolvedInitialIndex >= 0 ? resolvedInitialIndex : 0
      );
    }
  }, [cycleEnabled, resolvedInitialIndex]);

  // Navigate to a specific visualization type
  const navigateToVisualizationType = useCallback(
    (
      direction: 'next' | 'prev',
      currentType: 'waveform' | 'gauge' | 'pie' | 'clock'
    ) => {
      const currentTypeIndex = VISUALIZATION_TYPES.indexOf(currentType);
      if (currentTypeIndex === -1) return;

      let nextTypeIndex: number;
      if (direction === 'next') {
        nextTypeIndex = (currentTypeIndex + 1) % VISUALIZATION_TYPES.length;
      } else {
        nextTypeIndex =
          (currentTypeIndex - 1 + VISUALIZATION_TYPES.length) %
          VISUALIZATION_TYPES.length;
      }

      const nextType = VISUALIZATION_TYPES[nextTypeIndex];
      // Find first source with this visualization type
      const sourceIndex = DATA_SOURCES.findIndex(
        (source) => (source.visualizationType || 'waveform') === nextType
      );

      if (sourceIndex !== -1) {
        manualNavigationRef.current = true;
        setCurrentSourceIndex(sourceIndex);
        setShowSourceLabel(true);
        setTimeout(() => setShowSourceLabel(false), 6000);
        // Reset manual navigation flag after a delay
        setTimeout(() => {
          manualNavigationRef.current = false;
        }, 100);
      }
    },
    []
  );

  const labelHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const LABEL_VISIBLE_MS_WHEN_NOT_CYCLING = 5000;

  useEffect(() => {
    if (!isIdle) {
      setShowSourceLabel(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (labelHideTimeoutRef.current) {
        clearTimeout(labelHideTimeoutRef.current);
        labelHideTimeoutRef.current = null;
      }
      return;
    }

    if (!cycleEnabled) {
      setShowSourceLabel(true);
      if (labelHideTimeoutRef.current)
        clearTimeout(labelHideTimeoutRef.current);
      labelHideTimeoutRef.current = setTimeout(() => {
        setShowSourceLabel(false);
        labelHideTimeoutRef.current = null;
      }, LABEL_VISIBLE_MS_WHEN_NOT_CYCLING);
      return () => {
        if (labelHideTimeoutRef.current) {
          clearTimeout(labelHideTimeoutRef.current);
          labelHideTimeoutRef.current = null;
        }
      };
    }

    intervalRef.current = setInterval(() => {
      if (!manualNavigationRef.current) {
        setCurrentSourceIndex((prev) => (prev + 1) % DATA_SOURCES.length);
        setShowSourceLabel(true);
        setTimeout(() => setShowSourceLabel(false), 6000);
      }
    }, cycleInterval);

    setShowSourceLabel(true);
    setTimeout(() => setShowSourceLabel(false), 6000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isIdle, cycleInterval, cycleEnabled]);

  // Update time for data generation
  useEffect(() => {
    if (!isIdle) return;

    const startTime = Date.now();
    let rafId = 0;
    let stopped = false;
    const updateTime = () => {
      if (stopped) return;
      rafId = requestAnimationFrame(updateTime);
      if (document.hidden) return;
      timeRef.current = (Date.now() - startTime) / 1000;
    };
    rafId = requestAnimationFrame(updateTime);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
    };
  }, [isIdle]);

  const currentSource = DATA_SOURCES[currentSourceIndex];
  const getData = useCallback(
    (pointCount: number): number[] => {
      if (!isIdle) return [];
      return currentSource.getData(pointCount, timeRef.current);
    },
    [isIdle, currentSource]
  );

  const getValue = useCallback(():
    ReturnType<NonNullable<DataSource['getValue']>> | undefined => {
    if (currentSource.id === 'context') {
      return contextUsage != null
        ? { value: contextUsage.used, max: contextUsage.max }
        : { value: 0, max: 100 };
    }
    return currentSource.getValue?.();
    // contextUsage ref-stable: {used,max} changes identity each render unless memoized by caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentSource.id,
    currentSource.getValue,
    contextUsage?.used,
    contextUsage?.max,
  ]);

  return useMemo(
    () => ({
      currentSource,
      showSourceLabel,
      getData,
      visualizationType: currentSource.visualizationType || 'waveform',
      getValue,
      navigateToVisualizationType,
    }),
    [
      currentSource,
      showSourceLabel,
      getData,
      getValue,
      navigateToVisualizationType,
    ]
  );
};
