import type { WaveformSettings } from '@/components/background/BackgroundControlPanel';
import { useCallback, useEffect, useRef, useState } from 'react';

export type DataSource = {
  id: string;
  name: string;
  description: string;
  getData: (pointCount: number, time: number) => number[];
  waveformSettings?: Partial<WaveformSettings>;
  visualizationType?: 'waveform' | 'gauge' | 'pie' | 'clock';
  getValue?: () =>
    | number
    | { value: number; max: number }
    | { hours: number; minutes: number; seconds: number }
    | Promise<{ value: number; max: number }>;
  /** Returns recent sample buffer for sparkline-style visualization (e.g. FPS history). */
  getSparkData?: () => number[];
};

// Real-time frame timing data (using Performance API)
let frameTimingBuffer: number[] = [];
let fpsBuffer: number[] = [];
let lastFrameTime = performance.now();
const FRAME_TIMING_BUFFER_SIZE = 512;
const FPS_BUFFER_SIZE = 300;

const updateFrameTiming = () => {
  const now = performance.now();
  const frameDurationMs = now - lastFrameTime;
  lastFrameTime = now;

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

  requestAnimationFrame(updateFrameTiming);
};

// Start frame timing collection
if (typeof window !== 'undefined') {
  requestAnimationFrame(updateFrameTiming);
}

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
let lastNetworkCheck = 0;
const NETWORK_CHECK_INTERVAL = 50;
const NETWORK_BUFFER_SIZE = 256;
const NETWORK_COUNT_BUFFER_SIZE = 300;
let performanceObserver: PerformanceObserver | null = null;

// Track network requests
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
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
    // Performance Observer not supported or failed to initialize
  }
}

const updateNetworkActivity = () => {
  const now = performance.now();

  if (now - lastNetworkCheck >= NETWORK_CHECK_INTERVAL) {
    lastNetworkCheck = now;

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
  }

  requestAnimationFrame(updateNetworkActivity);
};

// Start network activity collection
if (typeof window !== 'undefined') {
  requestAnimationFrame(updateNetworkActivity);
}

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
  }, [isIdle, cycleInterval, cycleEnabled, currentSourceIndex]);

  // Update time for data generation
  useEffect(() => {
    if (!isIdle) return;

    const startTime = Date.now();
    const updateTime = () => {
      timeRef.current = (Date.now() - startTime) / 1000;
      requestAnimationFrame(updateTime);
    };
    const frameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(frameId);
  }, [isIdle]);

  const currentSource = DATA_SOURCES[currentSourceIndex];
  const getData = (pointCount: number): number[] => {
    if (!isIdle) return [];
    return currentSource.getData(pointCount, timeRef.current);
  };

  const getValue =
    currentSource.id === 'context'
      ? () =>
          contextUsage != null
            ? { value: contextUsage.used, max: contextUsage.max }
            : { value: 0, max: 100 }
      : currentSource.getValue;

  return {
    currentSource,
    showSourceLabel,
    getData,
    visualizationType: currentSource.visualizationType || 'waveform',
    getValue,
    navigateToVisualizationType,
  };
};
