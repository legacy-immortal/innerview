import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * @file Shared animation performance helpers — DPR capping and offscreen /
 * tab-hidden visibility tracking so canvas and WebGL loops can pause when
 * nothing is visible instead of burning GPU frames.
 */

/** Maximum device pixel ratio used by animation canvases. */
export const MAX_DPR = 1.25;

/** Poll interval (ms) used while an animation is offscreen or hidden. */
export const HIDDEN_POLL_MS = 500;

/** Frame-rate cap for background animations (30 fps). */
export const TARGET_FPS = 30;

/** Minimum interval (ms) between background animation frames. */
export const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

/** Quality levels from full to minimal. */
export type QualityLevel = 0 | 1 | 2;

/** Quality settings per level. */
export interface QualitySettings {
  /** Device pixel ratio cap. */
  readonly dpr: number;
  /** Frames per second cap. */
  readonly fps: number;
}

/** Settings table for {@link QualityLevel}. */
export const QUALITY_LEVELS: readonly QualitySettings[] = [
  { dpr: MAX_DPR, fps: TARGET_FPS },
  { dpr: 1, fps: TARGET_FPS },
  { dpr: 1, fps: 20 },
];

/**
 * Shared counter of rendered frames, incremented by animation scenes on each
 * render. Used by the anim-test harness to measure true render throughput.
 */
export const RENDER_COUNTER: { frames: number } = { frames: 0 };

/**
 * Adaptive quality governor: measures frame times and steps down quality
 * when p95 exceeds the budget, preserving Chakra/React frame rate.
 */
export class QualityGovernor {
  private frameTimes: number[] = [];
  private level: QualityLevel = 0;
  private badStreak = 0;
  private readonly windowSize = 60;
  private readonly budgetMs = 25;

  /** Record a frame duration and adjust level if needed. */
  public recordFrame(ms: number): void {
    this.frameTimes.push(ms);
    if (this.frameTimes.length > this.windowSize) this.frameTimes.shift();
    if (this.frameTimes.length < this.windowSize) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    if (p95 > this.budgetMs) {
      this.badStreak += 1;
      if (this.badStreak >= 2 && this.level < 2) {
        this.level = (this.level + 1) as QualityLevel;
        this.badStreak = 0;
        this.frameTimes = [];
      }
    } else {
      this.badStreak = 0;
    }
  }

  /** Current quality level. */
  public get currentLevel(): QualityLevel {
    return this.level;
  }

  /** Settings for the current level. */
  public get settings(): QualitySettings {
    return QUALITY_LEVELS[this.level] ?? QUALITY_LEVELS[0]!;
  }
}

/**
 * Get the capped device pixel ratio for a canvas.
 * @param level - Optional quality level to apply instead of {@link MAX_DPR}.
 * @returns `window.devicePixelRatio` clamped to the level cap.
 */
export function cappedDpr(level: QualityLevel = 0): number {
  if (typeof window === 'undefined') return 1;
  const cap = QUALITY_LEVELS[level]?.dpr ?? MAX_DPR;
  return Math.min(window.devicePixelRatio || 1, cap);
}

/**
 * Create a frame throttle that allows at most `fps` renders per second.
 * @param fps - The maximum frames per second (defaults to {@link TARGET_FPS}).
 * @returns A throttle with a `shouldRender(now)` check and a `reset()`.
 */
export function createFrameThrottle(fps: number = TARGET_FPS): {
  shouldRender: (now: number) => boolean;
  reset: () => void;
} {
  const minIntervalMs = 1000 / fps;
  let lastRender = 0;
  return {
    shouldRender: (now: number): boolean => {
      if (lastRender === 0 || now - lastRender >= minIntervalMs) {
        lastRender = now;
        return true;
      }
      return false;
    },
    reset: (): void => {
      lastRender = 0;
    },
  };
}

/**
 * Drive demand-mode R3F renders at a capped rate: calls `invalidate()` on an
 * interval so the animation advances at ~30 fps instead of every vsync.
 * Must be called inside a `<Canvas>`.
 * @param fps - Target render rate (defaults to {@link TARGET_FPS}).
 * @param governor - Optional governor to record frame times into.
 */
export function useThrottledFrames(
  fps: number = TARGET_FPS,
  governor?: QualityGovernor
): void {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      governor?.recordFrame(now - last);
      last = now;
      if (!document.hidden) invalidate();
    }, 1000 / fps);
    return () => {
      window.clearInterval(id);
    };
  }, [invalidate, fps, governor]);
}

/**
 * Measure frame cost and adapt DPR/FPS so background animations do not
 * starve the Chakra/React foreground.
 * @returns Current quality level and its settings.
 */
export function useAdaptiveQuality(): {
  level: QualityLevel;
  settings: QualitySettings;
  governor: QualityGovernor;
} {
  const [governor] = useState(() => new QualityGovernor());
  const [level, setLevel] = useState<QualityLevel>(governor.currentLevel);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      governor.recordFrame(now - last);
      last = now;
      if (governor.currentLevel !== level) setLevel(governor.currentLevel);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [governor, level]);
  return { level, settings: governor.settings, governor };
}

/** Visibility tracker returned by {@link createVisibilityPause}. */
export interface VisibilityPause {
  /** Whether the element is on screen and the tab is visible. */
  isVisible(): boolean;
  /** Stop observing; call from effect cleanup. */
  dispose(): void;
}

/**
 * Track whether an element is on screen and the document is visible.
 * @param el - The element to observe.
 * @returns A tracker whose `isVisible()` reflects the latest state.
 */
export function createVisibilityPause(el: HTMLElement): VisibilityPause {
  let intersecting = true;
  let visible = !document.hidden;
  const update = (): void => {
    visible = intersecting && !document.hidden;
  };
  const observer = new IntersectionObserver(
    (entries) => {
      intersecting = entries[0]?.isIntersecting ?? true;
      update();
    },
    { threshold: 0 }
  );
  observer.observe(el);
  const onVisibilityChange = (): void => update();
  document.addEventListener('visibilitychange', onVisibilityChange);
  update();
  return {
    isVisible: () => visible,
    dispose: () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}

/**
 * React hook subscribing to an element's onscreen / tab visibility.
 * @param ref - Ref to the element to observe.
 * @param enabled - When false the element always reports visible.
 * @returns True while the element should keep animating.
 */
export function useElementVisible(
  ref: RefObject<HTMLElement | null>,
  enabled = true
): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setVisible(true);
      return;
    }
    let intersecting = true;
    const update = (): void => {
      setVisible(intersecting && !document.hidden);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        intersecting = entries[0]?.isIntersecting ?? true;
        update();
      },
      { threshold: 0 }
    );
    observer.observe(el);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [ref, enabled]);
  return visible;
}
