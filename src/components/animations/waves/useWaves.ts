import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { cappedDpr, createVisibilityPause, HIDDEN_POLL_MS } from '../perf';
import { Noise } from './noise';
import type { Config, Mouse, Point, WavesProps } from './types';

/**
 * @file Waves renderer hook — owns canvas sizing, the Perlin-driven wave
 * field, pointer interaction, and the requestAnimationFrame loop. The small
 * canvas helpers inside the effect are single-purpose and extracted as named
 * inner functions to keep the hook readable.
 */

/** Refs returned by {@link useWaves} for the host element and canvas. */
export interface UseWavesResult {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * Set up the waves canvas simulation for the given props.
 * @param props - Wave behavior and interaction props.
 * @returns Container and canvas refs to bind to the host elements.
 */
export function useWaves({
  lineColor = 'black',
  waveSpeedX = 0.0125,
  waveSpeedY = 0.005,
  waveAmpX = 32,
  waveAmpY = 16,
  xGap = 10,
  yGap = 32,
  friction = 0.925,
  tension = 0.005,
  maxCursorMove = 100,
  enableMouseInteraction = false,
  reverseX = false,
  reverseY = false,
}: WavesProps): UseWavesResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const boundingRef = useRef<{
    width: number;
    height: number;
    left: number;
    top: number;
  }>({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });
  const noiseRef = useRef(new Noise(Math.random()));
  const linesRef = useRef<Point[][]>([]);
  const mouseRef = useRef<Mouse>({
    x: -10,
    y: 0,
    lx: 0,
    ly: 0,
    sx: 0,
    sy: 0,
    v: 0,
    vs: 0,
    a: 0,
    set: false,
  });
  const configRef = useRef<Config>({
    lineColor,
    waveSpeedX,
    waveSpeedY,
    waveAmpX,
    waveAmpY,
    friction,
    tension,
    maxCursorMove,
    xGap,
    yGap,
  });
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    configRef.current = {
      lineColor,
      waveSpeedX,
      waveSpeedY,
      waveAmpX,
      waveAmpY,
      friction,
      tension,
      maxCursorMove,
      xGap,
      yGap,
    };
  }, [
    lineColor,
    waveSpeedX,
    waveSpeedY,
    waveAmpX,
    waveAmpY,
    friction,
    tension,
    maxCursorMove,
    xGap,
    yGap,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    ctxRef.current = canvas.getContext('2d');

    function setSize(): void {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      boundingRef.current = {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
      };
      // Render at device pixels but display at CSS pixels (100% size)
      // so the canvas stays crisp without oversizing the layout.
      const dpr = cappedDpr();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctxRef.current?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setLines(): void {
      const { width, height } = boundingRef.current;
      linesRef.current = [];
      const oWidth = width + 200,
        oHeight = height + 30;
      const { xGap, yGap } = configRef.current;
      const totalLines = Math.ceil(oWidth / xGap);
      const totalPoints = Math.ceil(oHeight / yGap);
      const xStart = (width - xGap * totalLines) / 2;
      const yStart = (height - yGap * totalPoints) / 2;
      for (let i = 0; i <= totalLines; i++) {
        const pts: Point[] = [];
        for (let j = 0; j <= totalPoints; j++) {
          pts.push({
            x: xStart + xGap * i,
            y: yStart + yGap * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 },
          });
        }
        linesRef.current.push(pts);
      }
    }

    function movePoints(time: number): void {
      const lines = linesRef.current;
      const mouse = mouseRef.current;
      const noise = noiseRef.current;
      const {
        waveSpeedX,
        waveSpeedY,
        waveAmpX,
        waveAmpY,
        friction,
        tension,
        maxCursorMove,
      } = configRef.current;
      // Apply direction multipliers
      const effectiveSpeedX = waveSpeedX * (reverseX ? -1 : 1);
      const effectiveSpeedY = waveSpeedY * (reverseY ? -1 : 1);
      lines.forEach((pts) => {
        pts.forEach((p) => {
          const move =
            noise.perlin2(
              (p.x + time * effectiveSpeedX) * 0.002,
              (p.y + time * effectiveSpeedY) * 0.0015
            ) * 12;
          p.wave.x = Math.cos(move) * waveAmpX;
          p.wave.y = Math.sin(move) * waveAmpY;

          if (enableMouseInteraction) {
            const dx = p.x - mouse.sx,
              dy = p.y - mouse.sy;
            const dist = Math.hypot(dx, dy);
            const l = Math.max(175, mouse.vs);
            if (dist < l) {
              const s = 1 - dist / l;
              const f = Math.cos(dist * 0.001) * s;
              p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065;
              p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065;
            }

            p.cursor.vx += (0 - p.cursor.x) * tension;
            p.cursor.vy += (0 - p.cursor.y) * tension;
            p.cursor.vx *= friction;
            p.cursor.vy *= friction;
            p.cursor.x += p.cursor.vx * 2;
            p.cursor.y += p.cursor.vy * 2;
            p.cursor.x = Math.min(
              maxCursorMove,
              Math.max(-maxCursorMove, p.cursor.x)
            );
            p.cursor.y = Math.min(
              maxCursorMove,
              Math.max(-maxCursorMove, p.cursor.y)
            );
          } else {
            // Reset cursor position when mouse interaction is disabled
            p.cursor.x = 0;
            p.cursor.y = 0;
            p.cursor.vx = 0;
            p.cursor.vy = 0;
          }
        });
      });
    }

    function moved(point: Point, withCursor = true): { x: number; y: number } {
      const x = point.x + point.wave.x + (withCursor ? point.cursor.x : 0);
      const y = point.y + point.wave.y + (withCursor ? point.cursor.y : 0);
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    }

    function drawLines(): void {
      const { width, height } = boundingRef.current;
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = configRef.current.lineColor;
      linesRef.current.forEach((points) => {
        let p1 = moved(points[0], false);
        ctx.moveTo(p1.x, p1.y);
        points.forEach((p, idx) => {
          const isLast = idx === points.length - 1;
          p1 = moved(p, !isLast);
          const p2 = moved(
            points[idx + 1] || points[points.length - 1],
            !isLast
          );
          ctx.lineTo(p1.x, p1.y);
          if (isLast) ctx.moveTo(p2.x, p2.y);
        });
      });
      ctx.stroke();
    }

    const visibility = createVisibilityPause(container);
    let pollId: ReturnType<typeof setTimeout> | undefined;

    function tick(t: number): void {
      if (!container) return;
      if (!visibility.isVisible()) {
        // Offscreen / tab hidden: poll instead of simulating at 60fps.
        pollId = setTimeout(() => {
          pollId = undefined;
          frameIdRef.current = requestAnimationFrame(tick);
        }, HIDDEN_POLL_MS);
        return;
      }
      const mouse = mouseRef.current;
      if (enableMouseInteraction) {
        mouse.sx += (mouse.x - mouse.sx) * 0.1;
        mouse.sy += (mouse.y - mouse.sy) * 0.1;
        const dx = mouse.x - mouse.lx,
          dy = mouse.y - mouse.ly;
        const d = Math.hypot(dx, dy);
        mouse.v = d;
        mouse.vs += (d - mouse.vs) * 0.1;
        mouse.vs = Math.min(100, mouse.vs);
        mouse.lx = mouse.x;
        mouse.ly = mouse.y;
        mouse.a = Math.atan2(dy, dx);
        container.style.setProperty('--x', `${mouse.sx}px`);
        container.style.setProperty('--y', `${mouse.sy}px`);
      }

      movePoints(t);
      drawLines();
      frameIdRef.current = requestAnimationFrame(tick);
    }

    function onResize(): void {
      setSize();
      setLines();
    }
    function onMouseMove(e: MouseEvent): void {
      updateMouse(e.clientX, e.clientY);
    }
    function onTouchMove(e: TouchEvent): void {
      const touch = e.touches[0];
      if (touch) {
        updateMouse(touch.clientX, touch.clientY);
      }
    }
    function updateMouse(x: number, y: number): void {
      const mouse = mouseRef.current;
      const b = boundingRef.current;
      mouse.x = x - b.left;
      mouse.y = y - b.top;
      if (!mouse.set) {
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
        mouse.lx = mouse.x;
        mouse.ly = mouse.y;
        mouse.set = true;
      }
    }

    setSize();
    setLines();
    frameIdRef.current = requestAnimationFrame(tick);
    window.addEventListener('resize', onResize);
    if (enableMouseInteraction) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (pollId !== undefined) clearTimeout(pollId);
      visibility.dispose();
      if (enableMouseInteraction) {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onTouchMove);
      }
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
    // reverseX and reverseY are read from closure in movePoints, included for correctness
  }, [enableMouseInteraction, xGap, yGap, reverseX, reverseY]);

  return { containerRef, canvasRef };
}
